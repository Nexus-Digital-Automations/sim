# Sim AWS Multi-Cloud Deployment Configuration
# Enterprise-grade infrastructure with auto-scaling, load balancing, and high availability

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Variables for enterprise configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "sim-cluster"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "enable_multi_az" {
  description = "Enable multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "min_nodes" {
  description = "Minimum number of nodes in auto-scaling group"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum number of nodes in auto-scaling group"
  type        = number
  default     = 20
}

variable "desired_nodes" {
  description = "Desired number of nodes in auto-scaling group"
  type        = number
  default     = 3
}

variable "instance_types" {
  description = "EC2 instance types for worker nodes"
  type        = list(string)
  default     = ["m6i.large", "m5.large", "m5a.large"]
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI workloads"
  type        = bool
  default     = false
}

variable "gpu_instance_types" {
  description = "GPU instance types for AI workloads"
  type        = list(string)
  default     = ["g4dn.xlarge", "g4dn.2xlarge"]
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "database_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "SSL certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# Data sources for availability zones and VPC
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Configuration for multi-AZ deployment
resource "aws_vpc" "sim_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.cluster_name}-vpc"
    Environment = var.environment
    Project     = "sim"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "sim_igw" {
  vpc_id = aws_vpc.sim_vpc.id

  tags = {
    Name        = "${var.cluster_name}-igw"
    Environment = var.environment
    Project     = "sim"
  }
}

# Public Subnets for Load Balancers
resource "aws_subnet" "public_subnets" {
  count = var.enable_multi_az ? 3 : 2

  vpc_id                  = aws_vpc.sim_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                      = "${var.cluster_name}-public-${count.index + 1}"
    Environment                               = var.environment
    Project                                   = "sim"
    "kubernetes.io/role/elb"                 = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# Private Subnets for Application Pods
resource "aws_subnet" "private_subnets" {
  count = var.enable_multi_az ? 3 : 2

  vpc_id            = aws_vpc.sim_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                      = "${var.cluster_name}-private-${count.index + 1}"
    Environment                               = var.environment
    Project                                   = "sim"
    "kubernetes.io/role/internal-elb"        = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# Database Subnets
resource "aws_subnet" "database_subnets" {
  count = var.enable_multi_az ? 3 : 2

  vpc_id            = aws_vpc.sim_vpc.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.cluster_name}-db-${count.index + 1}"
    Environment = var.environment
    Project     = "sim"
  }
}

# Route Tables and Routes
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.sim_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sim_igw.id
  }

  tags = {
    Name        = "${var.cluster_name}-public-rt"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public_subnets)

  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public.id
}

# NAT Gateway for private subnet internet access
resource "aws_eip" "nat" {
  count = var.enable_multi_az ? 3 : 1

  domain = "vpc"
  tags = {
    Name        = "${var.cluster_name}-nat-eip-${count.index + 1}"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_nat_gateway" "nat" {
  count = var.enable_multi_az ? 3 : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id

  tags = {
    Name        = "${var.cluster_name}-nat-${count.index + 1}"
    Environment = var.environment
    Project     = "sim"
  }

  depends_on = [aws_internet_gateway.sim_igw]
}

resource "aws_route_table" "private" {
  count = var.enable_multi_az ? 3 : 1

  vpc_id = aws_vpc.sim_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = {
    Name        = "${var.cluster_name}-private-rt-${count.index + 1}"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private_subnets)

  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private[var.enable_multi_az ? count.index : 0].id
}

# Security Groups
resource "aws_security_group" "eks_cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "EKS cluster security group"
  vpc_id      = aws_vpc.sim_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-cluster-sg"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_security_group" "eks_nodes" {
  name        = "${var.cluster_name}-nodes-sg"
  description = "EKS worker nodes security group"
  vpc_id      = aws_vpc.sim_vpc.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-nodes-sg"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "RDS security group"
  vpc_id      = aws_vpc.sim_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = {
    Name        = "${var.cluster_name}-rds-sg"
    Environment = var.environment
    Project     = "sim"
  }
}

# IAM Roles for EKS
resource "aws_iam_role" "eks_cluster" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_nodes" {
  name = "${var.cluster_name}-nodes-role"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# Additional IAM policy for Sim-specific AWS integrations
resource "aws_iam_policy" "sim_s3_policy" {
  name        = "${var.cluster_name}-s3-policy"
  description = "IAM policy for Sim S3 integration"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.sim_storage.arn,
          "${aws_s3_bucket.sim_storage.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_iam_role_policy_attachment" "sim_s3_policy" {
  policy_arn = aws_iam_policy.sim_s3_policy.arn
  role       = aws_iam_role.eks_nodes.name
}

# EKS Cluster
resource "aws_eks_cluster" "sim_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public_subnets[*].id, aws_subnet.private_subnets[*].id)
    security_group_ids      = [aws_security_group.eks_cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# EKS Node Groups with Auto Scaling
resource "aws_eks_node_group" "sim_nodes" {
  cluster_name    = aws_eks_cluster.sim_cluster.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  instance_types  = var.instance_types
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = var.desired_nodes
    max_size     = var.max_nodes
    min_size     = var.min_nodes
  }

  update_config {
    max_unavailable = 1
  }

  # Launch template for advanced configuration
  launch_template {
    name    = aws_launch_template.sim_nodes.name
    version = aws_launch_template.sim_nodes.latest_version
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
    aws_iam_role_policy_attachment.sim_s3_policy,
  ]

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Launch Template for Node Group
resource "aws_launch_template" "sim_nodes" {
  name = "${var.cluster_name}-nodes-lt"

  vpc_security_group_ids = [aws_security_group.eks_nodes.id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      throughput            = 125
      iops                  = 3000
      delete_on_termination = true
      encrypted             = true
    }
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.cluster_name}-node"
      Environment = var.environment
      Project     = "sim"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# GPU Node Group (conditional)
resource "aws_eks_node_group" "sim_gpu_nodes" {
  count = var.enable_gpu_nodes ? 1 : 0

  cluster_name    = aws_eks_cluster.sim_cluster.name
  node_group_name = "${var.cluster_name}-gpu-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private_subnets[*].id
  instance_types  = var.gpu_instance_types
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = 1
    max_size     = 3
    min_size     = 0
  }

  update_config {
    max_unavailable = 1
  }

  taint {
    key    = "sim.ai/gpu"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Environment = var.environment
    Project     = "sim"
    NodeType    = "gpu"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "sim_db" {
  name       = "${var.cluster_name}-db-subnet-group"
  subnet_ids = aws_subnet.database_subnets[*].id

  tags = {
    Name        = "${var.cluster_name}-db-subnet-group"
    Environment = var.environment
    Project     = "sim"
  }
}

# RDS Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "sim_db" {
  family = "postgres15"
  name   = "${var.cluster_name}-db-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pg_cron"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries longer than 1 second
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# RDS Instance with Multi-AZ support
resource "aws_db_instance" "sim_db" {
  identifier                = "${var.cluster_name}-db"
  engine                    = "postgres"
  engine_version           = "15.4"
  instance_class           = var.database_instance_class
  allocated_storage        = var.database_allocated_storage
  max_allocated_storage    = var.database_allocated_storage * 3
  storage_type            = "gp3"
  storage_encrypted       = true

  db_name  = "sim"
  username = "simadmin"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.sim_db.name
  parameter_group_name   = aws_db_parameter_group.sim_db.name

  multi_az               = var.enable_multi_az
  publicly_accessible    = false
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.cluster_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "${var.cluster_name}-db"
    Environment = var.environment
    Project     = "sim"
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "sim_storage" {
  bucket = "${var.cluster_name}-storage-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.cluster_name}-storage"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "sim_storage" {
  bucket = aws_s3_bucket.sim_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sim_storage" {
  bucket = aws_s3_bucket.sim_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "sim_storage" {
  bucket = aws_s3_bucket.sim_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ElastiCache Redis Cluster for caching
resource "aws_elasticache_subnet_group" "sim_cache" {
  name       = "${var.cluster_name}-cache-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id

  tags = {
    Name        = "${var.cluster_name}-cache-subnet-group"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_security_group" "elasticache" {
  name        = "${var.cluster_name}-cache-sg"
  description = "ElastiCache security group"
  vpc_id      = aws_vpc.sim_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = {
    Name        = "${var.cluster_name}-cache-sg"
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_elasticache_replication_group" "sim_cache" {
  replication_group_id       = "${var.cluster_name}-cache"
  description                = "Redis cluster for Sim caching"
  
  node_type                  = "cache.r7g.large"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = var.enable_multi_az ? 3 : 1
  automatic_failover_enabled = var.enable_multi_az
  multi_az_enabled          = var.enable_multi_az
  
  subnet_group_name         = aws_elasticache_subnet_group.sim_cache.name
  security_group_ids        = [aws_security_group.elasticache.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.cache_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Name        = "${var.cluster_name}-cache"
    Environment = var.environment
    Project     = "sim"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_cloudwatch_log_group" "cache_slow_log" {
  name              = "/aws/elasticache/${var.cluster_name}/slow-log"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Application Load Balancer (ALB) Ingress Controller
resource "aws_iam_role" "alb_controller" {
  name = "${var.cluster_name}-alb-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.sim_cluster.identity[0].oidc[0].issuer, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
          }
        }
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_iam_policy" "alb_controller" {
  name        = "${var.cluster_name}-alb-controller-policy"
  description = "IAM policy for AWS Load Balancer Controller"

  policy = file("${path.module}/alb-controller-policy.json")

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  policy_arn = aws_iam_policy.alb_controller.arn
  role       = aws_iam_role.alb_controller.name
}

# OIDC provider for EKS
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]
  url             = aws_eks_cluster.sim_cluster.identity[0].oidc[0].issuer

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "sim_secrets" {
  name        = "${var.cluster_name}-secrets"
  description = "Sim application secrets"

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "aws_secretsmanager_secret_version" "sim_secrets" {
  secret_id = aws_secretsmanager_secret.sim_secrets.id
  secret_string = jsonencode({
    database_url        = "postgresql://simadmin:${random_password.db_password.result}@${aws_db_instance.sim_db.endpoint}:5432/sim"
    redis_url          = "redis://${aws_elasticache_replication_group.sim_cache.configuration_endpoint_address}:6379"
    better_auth_secret = random_password.auth_secret.result
    encryption_key     = random_password.encryption_key.result
  })
}

resource "random_password" "auth_secret" {
  length  = 32
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# Outputs for other modules and applications
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.sim_cluster.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.sim_cluster.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.sim_cluster.arn
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.sim_db.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.sim_cache.configuration_endpoint_address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  value       = aws_s3_bucket.sim_storage.bucket
}

output "secrets_manager_arn" {
  description = "Secrets Manager ARN for application secrets"
  value       = aws_secretsmanager_secret.sim_secrets.arn
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.sim_vpc.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private_subnets[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public_subnets[*].id
}