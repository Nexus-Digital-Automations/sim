# Sim Google Cloud Platform Multi-Cloud Deployment Configuration
# Enterprise-grade infrastructure with auto-scaling, load balancing, and high availability

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
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
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zones" {
  description = "GCP zones for multi-zone deployment"
  type        = list(string)
  default     = ["us-central1-a", "us-central1-b", "us-central1-c"]
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "sim-cluster"
}

variable "enable_multi_zone" {
  description = "Enable multi-zone deployment for high availability"
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

variable "initial_node_count" {
  description = "Initial number of nodes"
  type        = number
  default     = 3
}

variable "machine_type" {
  description = "Machine type for worker nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI workloads"
  type        = bool
  default     = false
}

variable "gpu_machine_type" {
  description = "Machine type for GPU nodes"
  type        = string
  default     = "n1-standard-4"
}

variable "gpu_type" {
  description = "GPU type for GPU nodes"
  type        = string
  default     = "nvidia-tesla-t4"
}

variable "gpu_count" {
  description = "Number of GPUs per node"
  type        = number
  default     = 1
}

variable "database_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-4-16384"  # 4 vCPUs, 16GB RAM
}

variable "database_disk_size" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 100
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Backup start time (HH:MM format)"
  type        = string
  default     = "03:00"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Configure GCP Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "container.googleapis.com",
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudkms.googleapis.com",
    "storage.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = true
  disable_on_destroy         = false
}

# VPC Network
resource "google_compute_network" "sim_vpc" {
  name                    = "${var.cluster_name}-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460

  depends_on = [google_project_service.required_apis]
}

# Subnet for GKE cluster
resource "google_compute_subnetwork" "sim_subnet" {
  name          = "${var.cluster_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.sim_vpc.id

  secondary_ip_range {
    range_name    = "${var.cluster_name}-pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "${var.cluster_name}-services"
    ip_cidr_range = "10.2.0.0/20"
  }

  private_ip_google_access = true
}

# Private Service Connection for Cloud SQL
resource "google_compute_global_address" "private_service_range" {
  name          = "${var.cluster_name}-private-service-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 24
  network       = google_compute_network.sim_vpc.id

  depends_on = [google_project_service.required_apis]
}

resource "google_service_networking_connection" "private_service_connection" {
  network                 = google_compute_network.sim_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]

  depends_on = [google_project_service.required_apis]
}

# Cloud NAT for outbound internet access
resource "google_compute_router" "sim_router" {
  name    = "${var.cluster_name}-router"
  region  = var.region
  network = google_compute_network.sim_vpc.id
}

resource "google_compute_router_nat" "sim_nat" {
  name                               = "${var.cluster_name}-nat"
  router                             = google_compute_router.sim_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.cluster_name}-allow-internal"
  network = google_compute_network.sim_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/8"]
}

resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.cluster_name}-allow-health-checks"
  network = google_compute_network.sim_vpc.name

  allow {
    protocol = "tcp"
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["gke-node"]
}

# Artifact Registry for container images
resource "google_artifact_registry_repository" "sim_registry" {
  location      = var.region
  repository_id = "${var.cluster_name}-registry"
  description   = "Sim container registry"
  format        = "DOCKER"

  depends_on = [google_project_service.required_apis]
}

# Service Account for GKE nodes
resource "google_service_account" "gke_node_sa" {
  account_id   = "${var.cluster_name}-node-sa"
  display_name = "GKE Node Service Account"
  description  = "Service account for GKE nodes"
}

# IAM bindings for GKE node service account
resource "google_project_iam_member" "gke_node_sa_bindings" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/storage.objectViewer",
    "roles/artifactregistry.reader",
    "roles/secretmanager.secretAccessor"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_node_sa.email}"
}

# GKE Cluster
resource "google_container_cluster" "sim_cluster" {
  name     = var.cluster_name
  location = var.enable_multi_zone ? var.region : var.zones[0]

  # Remove default node pool immediately
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.sim_vpc.name
  subnetwork = google_compute_subnetwork.sim_subnet.name

  # Enable IP aliasing for better performance
  ip_allocation_policy {
    cluster_secondary_range_name  = "${var.cluster_name}-pods"
    services_secondary_range_name = "${var.cluster_name}-services"
  }

  # Network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "10.3.0.0/28"

    master_global_access_config {
      enabled = true
    }
  }

  # Master auth networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable various addons
  addons_config {
    http_load_balancing {
      disabled = false
    }

    horizontal_pod_autoscaling {
      disabled = false
    }

    network_policy_config {
      disabled = false
    }

    cloudrun_config {
      disabled = true
    }

    dns_cache_config {
      enabled = true
    }

    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  # Enable binary authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Enable shielded nodes
  enable_shielded_nodes = true

  # Maintenance policy
  maintenance_policy {
    recurring_window {
      start_time = "2023-01-01T09:00:00Z"
      end_time   = "2023-01-01T17:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }
  }

  # Resource usage export config
  resource_usage_export_config {
    enable_network_egress_metering       = true
    enable_resource_consumption_metering = true
    bigquery_destination {
      dataset_id = google_bigquery_dataset.gke_usage.dataset_id
    }
  }

  # Monitoring and logging
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "API_SERVER"
    ]
  }

  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "APISERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ]
    
    managed_prometheus {
      enabled = true
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_service_networking_connection.private_service_connection,
  ]
}

# BigQuery dataset for GKE usage data
resource "google_bigquery_dataset" "gke_usage" {
  dataset_id  = "${replace(var.cluster_name, "-", "_")}_gke_usage"
  description = "GKE cluster usage data"
  location    = "US"

  depends_on = [google_project_service.required_apis]
}

# System node pool
resource "google_container_node_pool" "system_pool" {
  name       = "system-pool"
  cluster    = google_container_cluster.sim_cluster.name
  location   = google_container_cluster.sim_cluster.location
  node_count = var.enable_multi_zone ? null : var.initial_node_count

  dynamic "autoscaling" {
    for_each = var.enable_multi_zone ? [1] : []
    content {
      total_min_node_count = var.min_nodes
      total_max_node_count = var.max_nodes
      location_policy      = "BALANCED"
    }
  }

  dynamic "autoscaling" {
    for_each = var.enable_multi_zone ? [] : [1]
    content {
      min_node_count = var.min_nodes
      max_node_count = var.max_nodes
    }
  }

  node_config {
    preemptible  = false
    machine_type = var.machine_type
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    image_type   = "COS_CONTAINERD"

    labels = {
      environment = var.environment
      project     = "sim"
      pool        = "system"
    }

    tags = ["gke-node", "${var.cluster_name}-node"]

    service_account = google_service_account.gke_node_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }
}

# Application node pool
resource "google_container_node_pool" "app_pool" {
  name       = "app-pool"
  cluster    = google_container_cluster.sim_cluster.name
  location   = google_container_cluster.sim_cluster.location
  node_count = var.enable_multi_zone ? null : var.initial_node_count

  dynamic "autoscaling" {
    for_each = var.enable_multi_zone ? [1] : []
    content {
      total_min_node_count = var.min_nodes
      total_max_node_count = var.max_nodes
      location_policy      = "BALANCED"
    }
  }

  dynamic "autoscaling" {
    for_each = var.enable_multi_zone ? [] : [1]
    content {
      min_node_count = var.min_nodes
      max_node_count = var.max_nodes
    }
  }

  node_config {
    preemptible  = false
    machine_type = var.machine_type
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    image_type   = "COS_CONTAINERD"

    labels = {
      environment = var.environment
      project     = "sim"
      pool        = "application"
    }

    taint {
      key    = "workload"
      value  = "application"
      effect = "NO_SCHEDULE"
    }

    tags = ["gke-node", "${var.cluster_name}-node"]

    service_account = google_service_account.gke_node_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }
}

# GPU node pool (conditional)
resource "google_container_node_pool" "gpu_pool" {
  count = var.enable_gpu_nodes ? 1 : 0

  name       = "gpu-pool"
  cluster    = google_container_cluster.sim_cluster.name
  location   = var.zones[0]  # GPU nodes in single zone for cost optimization
  node_count = 1

  autoscaling {
    min_node_count = 0
    max_node_count = 3
  }

  node_config {
    preemptible  = false
    machine_type = var.gpu_machine_type
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    image_type   = "COS_CONTAINERD"

    labels = {
      environment = var.environment
      project     = "sim"
      pool        = "gpu"
      accelerator = "nvidia"
    }

    taint {
      key    = "sim.ai/gpu"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    tags = ["gke-node", "${var.cluster_name}-gpu-node"]

    guest_accelerator {
      type  = var.gpu_type
      count = var.gpu_count

      gpu_driver_installation_config {
        gpu_driver_version = "DEFAULT"
      }
    }

    service_account = google_service_account.gke_node_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    strategy        = "SURGE"
    max_surge       = 1
    max_unavailable = 0
  }
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "sim_db" {
  name             = "${var.cluster_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.database_tier
    availability_type = var.enable_multi_zone ? "REGIONAL" : "ZONAL"
    disk_size         = var.database_disk_size
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    edition           = "ENTERPRISE"

    backup_configuration {
      enabled                        = var.enable_backup
      start_time                     = var.backup_start_time
      location                       = var.region
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.sim_vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "shared_preload_libraries"
      value = "vector"
    }

    database_flags {
      name  = "log_statement"
      value = "all"
    }

    database_flags {
      name  = "log_duration"
      value = "on"
    }

    maintenance_window {
      day  = 7  # Sunday
      hour = 3  # 3 AM
    }
  }

  deletion_protection = true

  depends_on = [
    google_service_networking_connection.private_service_connection,
    google_project_service.required_apis,
  ]
}

# Database user
resource "google_sql_user" "sim_user" {
  name     = "simadmin"
  instance = google_sql_database_instance.sim_db.name
  password = random_password.db_password.result
}

# Database
resource "google_sql_database" "sim_db" {
  name     = "sim"
  instance = google_sql_database_instance.sim_db.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

# Random password for database
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Memorystore Redis instance
resource "google_redis_instance" "sim_cache" {
  name           = "${var.cluster_name}-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 4
  region         = var.region
  location_id    = var.zones[0]
  alternative_location_id = var.enable_multi_zone ? var.zones[1] : null

  authorized_network = google_compute_network.sim_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version     = "REDIS_7_0"
  display_name      = "Sim Cache"
  reserved_ip_range = "10.4.0.0/29"

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours = 3
      }
    }
  }

  depends_on = [
    google_service_networking_connection.private_service_connection,
    google_project_service.required_apis,
  ]
}

# Cloud Storage bucket
resource "google_storage_bucket" "sim_storage" {
  name          = "${var.project_id}-${var.cluster_name}-storage"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  depends_on = [google_project_service.required_apis]
}

# KMS key ring and key for encryption
resource "google_kms_key_ring" "sim_keyring" {
  name     = "${var.cluster_name}-keyring"
  location = var.region

  depends_on = [google_project_service.required_apis]
}

resource "google_kms_crypto_key" "storage_key" {
  name            = "storage-key"
  key_ring        = google_kms_key_ring.sim_keyring.id
  rotation_period = "7776000s"  # 90 days

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# IAM binding for Cloud Storage service account to use KMS key
data "google_storage_project_service_account" "gcs_account" {}

resource "google_kms_crypto_key_iam_binding" "storage_key_binding" {
  crypto_key_id = google_kms_crypto_key.storage_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  
  members = [
    "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}",
    "serviceAccount:${google_service_account.gke_node_sa.email}"
  ]
}

# Secret Manager secrets
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.cluster_name}-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://simadmin:${random_password.db_password.result}@${google_sql_database_instance.sim_db.private_ip_address}:5432/sim"
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "${var.cluster_name}-redis-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "redis://${google_redis_instance.sim_cache.host}:${google_redis_instance.sim_cache.port}"
}

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "${var.cluster_name}-better-auth-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "better_auth_secret" {
  secret      = google_secret_manager_secret.better_auth_secret.id
  secret_data = random_password.auth_secret.result
}

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "${var.cluster_name}-encryption-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "encryption_key" {
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = random_password.encryption_key.result
}

# Random passwords
resource "random_password" "auth_secret" {
  length  = 32
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# Global static IP for load balancer
resource "google_compute_global_address" "sim_ip" {
  name = "${var.cluster_name}-global-ip"

  depends_on = [google_project_service.required_apis]
}

# Cloud Monitoring notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Sim Email Alerts"
  type         = "email"
  labels = {
    email_address = "alerts@sim.ai"
  }

  depends_on = [google_project_service.required_apis]
}

# Alerting policies
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Usage"
  combiner     = "OR"

  conditions {
    display_name = "GKE Node CPU > 80%"

    condition_threshold {
      filter         = "resource.type=\"gke_node\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\""
      duration       = "300s"
      comparison     = "COMPARISON_GREATER_THAN"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  depends_on = [google_project_service.required_apis]
}

resource "google_monitoring_alert_policy" "high_memory" {
  display_name = "High Memory Usage"
  combiner     = "OR"

  conditions {
    display_name = "GKE Node Memory > 80%"

    condition_threshold {
      filter         = "resource.type=\"gke_node\" AND metric.type=\"kubernetes.io/node/memory/allocatable_utilization\""
      duration       = "300s"
      comparison     = "COMPARISON_GREATER_THAN"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  depends_on = [google_project_service.required_apis]
}

# Cloud Build trigger for CI/CD (optional)
resource "google_cloudbuild_trigger" "sim_build" {
  name        = "${var.cluster_name}-build-trigger"
  description = "Build and deploy Sim application"

  github {
    owner = "simstudioai"
    name  = "sim"
    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _CLUSTER_NAME = var.cluster_name
    _REGION       = var.region
    _PROJECT_ID   = var.project_id
  }

  depends_on = [google_project_service.required_apis]
}

# Outputs
output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.sim_cluster.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.sim_cluster.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = base64decode(google_container_cluster.sim_cluster.master_auth.0.cluster_ca_certificate)
  sensitive   = true
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.sim_registry.name
}

output "database_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.sim_db.private_ip_address
  sensitive   = true
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.sim_cache.host
  sensitive   = true
}

output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.sim_cache.port
}

output "storage_bucket_name" {
  description = "Cloud Storage bucket name"
  value       = google_storage_bucket.sim_storage.name
}

output "global_ip_address" {
  description = "Global static IP address"
  value       = google_compute_global_address.sim_ip.address
}

output "secret_manager_prefix" {
  description = "Secret Manager secret prefix"
  value       = var.cluster_name
}

output "vpc_network" {
  description = "VPC network name"
  value       = google_compute_network.sim_vpc.name
}

output "subnet_name" {
  description = "Subnet name"
  value       = google_compute_subnetwork.sim_subnet.name
}