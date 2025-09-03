# Sim Azure Multi-Cloud Deployment Configuration
# Enterprise-grade infrastructure with auto-scaling, load balancing, and high availability

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
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

# Configure Azure Provider
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Variables for enterprise configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US 2"
}

variable "cluster_name" {
  description = "AKS cluster name"
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

variable "default_node_count" {
  description = "Default number of nodes"
  type        = number
  default     = 3
}

variable "vm_size" {
  description = "VM size for worker nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI workloads"
  type        = bool
  default     = false
}

variable "gpu_vm_size" {
  description = "VM size for GPU nodes"
  type        = string
  default     = "Standard_NC6s_v3"
}

variable "postgresql_sku_name" {
  description = "PostgreSQL SKU name"
  type        = string
  default     = "GP_Standard_D4s_v3"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 102400  # 100 GB
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Current client data
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "sim" {
  name     = "${var.cluster_name}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "sim" {
  name                = "${var.cluster_name}-vnet"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Subnets
resource "azurerm_subnet" "aks" {
  name                 = "${var.cluster_name}-aks-subnet"
  resource_group_name  = azurerm_resource_group.sim.name
  virtual_network_name = azurerm_virtual_network.sim.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "${var.cluster_name}-db-subnet"
  resource_group_name  = azurerm_resource_group.sim.name
  virtual_network_name = azurerm_virtual_network.sim.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "fs"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "${var.cluster_name}-pe-subnet"
  resource_group_name  = azurerm_resource_group.sim.name
  virtual_network_name = azurerm_virtual_network.sim.name
  address_prefixes     = ["10.0.3.0/24"]

  private_endpoint_network_policies_enabled = false
}

# Network Security Groups
resource "azurerm_network_security_group" "aks" {
  name                = "${var.cluster_name}-aks-nsg"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# Azure Container Registry
resource "azurerm_container_registry" "sim" {
  name                = "${replace(var.cluster_name, "-", "")}acr"
  resource_group_name = azurerm_resource_group.sim.name
  location            = azurerm_resource_group.sim.location
  sku                 = "Premium"
  admin_enabled       = false

  public_network_access_enabled = true
  network_rule_bypass_option    = "AzureServices"

  retention_policy {
    days    = 30
    enabled = true
  }

  trust_policy {
    enabled = false
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "sim" {
  name                = "${var.cluster_name}-logs"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Application Insights
resource "azurerm_application_insights" "sim" {
  name                = "${var.cluster_name}-appinsights"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name
  workspace_id        = azurerm_log_analytics_workspace.sim.id
  application_type    = "web"

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# User Assigned Identity for AKS
resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.cluster_name}-aks-identity"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Role assignments for AKS identity
resource "azurerm_role_assignment" "aks_network_contributor" {
  scope                = azurerm_virtual_network.sim.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.sim.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.aks.principal_id
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "sim" {
  name                = var.cluster_name
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name
  dns_prefix          = "${var.cluster_name}-k8s"
  kubernetes_version  = "1.28.5"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  default_node_pool {
    name                = "system"
    node_count          = var.default_node_count
    vm_size             = var.vm_size
    type                = "VirtualMachineScaleSets"
    availability_zones  = var.enable_multi_zone ? ["1", "2", "3"] : null
    enable_auto_scaling = true
    min_count          = var.min_nodes
    max_count          = var.max_nodes
    max_pods           = 30
    os_disk_size_gb    = 50
    os_disk_type       = "Ephemeral"
    vnet_subnet_id     = azurerm_subnet.aks.id

    upgrade_settings {
      max_surge = "10%"
    }

    tags = {
      Environment = var.environment
      Project     = "sim"
      NodePool    = "system"
    }
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  addon_profile {
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.sim.id
    }

    azure_policy {
      enabled = true
    }

    http_application_routing {
      enabled = false
    }
  }

  role_based_access_control_enabled = true

  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }

  depends_on = [
    azurerm_role_assignment.aks_network_contributor,
    azurerm_role_assignment.aks_acr_pull,
  ]
}

# Application Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "application" {
  name                  = "application"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.sim.id
  vm_size              = var.vm_size
  node_count           = var.default_node_count
  availability_zones   = var.enable_multi_zone ? ["1", "2", "3"] : null
  enable_auto_scaling  = true
  min_count           = var.min_nodes
  max_count           = var.max_nodes
  max_pods            = 30
  os_disk_size_gb     = 50
  os_disk_type        = "Ephemeral"
  vnet_subnet_id      = azurerm_subnet.aks.id

  node_taints = [
    "workload=application:NoSchedule"
  ]

  node_labels = {
    "workload" = "application"
  }

  upgrade_settings {
    max_surge = "10%"
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
    NodePool    = "application"
  }
}

# GPU Node Pool (conditional)
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  count = var.enable_gpu_nodes ? 1 : 0

  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.sim.id
  vm_size              = var.gpu_vm_size
  node_count           = 1
  availability_zones   = var.enable_multi_zone ? ["1"] : null
  enable_auto_scaling  = true
  min_count           = 0
  max_count           = 3
  max_pods            = 30
  os_disk_size_gb     = 100
  os_disk_type        = "Ephemeral"
  vnet_subnet_id      = azurerm_subnet.aks.id

  node_taints = [
    "sim.ai/gpu=true:NoSchedule"
  ]

  node_labels = {
    "accelerator"     = "nvidia"
    "sim.ai/gpu"      = "true"
  }

  upgrade_settings {
    max_surge = "10%"
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
    NodePool    = "gpu"
  }
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "sim.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.sim.name

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "${var.cluster_name}-postgresql-dns-link"
  resource_group_name   = azurerm_resource_group.sim.name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "sim" {
  name                   = "${var.cluster_name}-db"
  resource_group_name    = azurerm_resource_group.sim.name
  location               = azurerm_resource_group.sim.location
  version                = "15"
  delegated_subnet_id    = azurerm_subnet.database.id
  private_dns_zone_id    = azurerm_private_dns_zone.postgresql.id
  administrator_login    = "simadmin"
  administrator_password = random_password.postgresql_password.result
  zone                   = var.enable_multi_zone ? "1" : null

  storage_mb = var.postgresql_storage_mb

  sku_name = var.postgresql_sku_name

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.enable_multi_zone

  high_availability {
    mode                      = var.enable_multi_zone ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.enable_multi_zone ? "2" : null
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 8
    start_minute = 0
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgresql]
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "sim" {
  name      = "sim"
  server_id = azurerm_postgresql_flexible_server.sim.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# PostgreSQL Configuration for pgvector extension
resource "azurerm_postgresql_flexible_server_configuration" "pgvector" {
  name      = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.sim.id
  value     = "vector"
}

# Random password for PostgreSQL
resource "random_password" "postgresql_password" {
  length  = 16
  special = true
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "sim" {
  name                = "${var.cluster_name}-cache"
  location            = azurerm_resource_group.sim.location
  resource_group_name = azurerm_resource_group.sim.name
  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    enable_authentication           = true
    maxmemory_reserved              = 30
    maxmemory_delta                 = 30
    maxmemory_policy                = "allkeys-lru"
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Storage Account for file storage
resource "azurerm_storage_account" "sim" {
  name                     = "${replace(var.cluster_name, "-", "")}storage"
  resource_group_name      = azurerm_resource_group.sim.name
  location                 = azurerm_resource_group.sim.location
  account_tier             = "Standard"
  account_replication_type = var.enable_multi_zone ? "ZRS" : "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    change_feed_retention_in_days = 7
    last_access_time_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Storage Container for application files
resource "azurerm_storage_container" "sim_files" {
  name                  = "sim-files"
  storage_account_name  = azurerm_storage_account.sim.name
  container_access_type = "private"
}

# Key Vault for secrets management
resource "azurerm_key_vault" "sim" {
  name                       = "${var.cluster_name}-kv"
  location                   = azurerm_resource_group.sim.location
  resource_group_name        = azurerm_resource_group.sim.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]
  }

  # Access policy for AKS identity
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_user_assigned_identity.aks.principal_id

    secret_permissions = [
      "Get", "List"
    ]
  }

  network_acls {
    default_action             = "Deny"
    bypass                     = "AzureServices"
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  value        = "postgresql://simadmin:${random_password.postgresql_password.result}@${azurerm_postgresql_flexible_server.sim.fqdn}:5432/sim"
  key_vault_id = azurerm_key_vault.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_key_vault_secret" "redis_url" {
  name         = "redis-url"
  value        = "rediss://:${azurerm_redis_cache.sim.primary_access_key}@${azurerm_redis_cache.sim.hostname}:6380"
  key_vault_id = azurerm_key_vault.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_key_vault_secret" "better_auth_secret" {
  name         = "better-auth-secret"
  value        = random_password.auth_secret.result
  key_vault_id = azurerm_key_vault.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_key_vault_secret" "encryption_key" {
  name         = "encryption-key"
  value        = random_password.encryption_key.result
  key_vault_id = azurerm_key_vault.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.sim.primary_connection_string
  key_vault_id = azurerm_key_vault.sim.id

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
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

# Azure Front Door for global load balancing and CDN
resource "azurerm_cdn_frontdoor_profile" "sim" {
  name                = "${var.cluster_name}-afd"
  resource_group_name = azurerm_resource_group.sim.name
  sku_name           = "Standard_AzureFrontDoor"

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Public IP for Load Balancer
resource "azurerm_public_ip" "sim" {
  name                = "${var.cluster_name}-lb-pip"
  resource_group_name = azurerm_resource_group.sim.name
  location            = azurerm_resource_group.sim.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = var.enable_multi_zone ? ["1", "2", "3"] : null

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Monitoring Action Group
resource "azurerm_monitor_action_group" "sim" {
  name                = "${var.cluster_name}-alerts"
  resource_group_name = azurerm_resource_group.sim.name
  short_name          = "sim-alerts"

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Metric Alerts
resource "azurerm_monitor_metric_alert" "cpu_usage" {
  name                = "${var.cluster_name}-high-cpu"
  resource_group_name = azurerm_resource_group.sim.name
  scopes              = [azurerm_kubernetes_cluster.sim.id]
  description         = "High CPU usage on AKS cluster"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.sim.id
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

resource "azurerm_monitor_metric_alert" "memory_usage" {
  name                = "${var.cluster_name}-high-memory"
  resource_group_name = azurerm_resource_group.sim.name
  scopes              = [azurerm_kubernetes_cluster.sim.id]
  description         = "High memory usage on AKS cluster"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_working_set_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.sim.id
  }

  tags = {
    Environment = var.environment
    Project     = "sim"
  }
}

# Outputs
output "cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.sim.name
}

output "cluster_endpoint" {
  description = "AKS cluster endpoint"
  value       = azurerm_kubernetes_cluster.sim.kube_config.0.host
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "AKS cluster CA certificate"
  value       = base64decode(azurerm_kubernetes_cluster.sim.kube_config.0.cluster_ca_certificate)
  sensitive   = true
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.sim.name
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.sim.login_server
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.sim.vault_uri
  sensitive   = true
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.sim.name
}

output "storage_container_name" {
  description = "Storage container name for files"
  value       = azurerm_storage_container.sim_files.name
}

output "postgresql_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.sim.fqdn
  sensitive   = true
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.sim.hostname
  sensitive   = true
}

output "public_ip_address" {
  description = "Public IP address for load balancer"
  value       = azurerm_public_ip.sim.ip_address
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.sim.instrumentation_key
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.sim.workspace_id
  sensitive   = true
}