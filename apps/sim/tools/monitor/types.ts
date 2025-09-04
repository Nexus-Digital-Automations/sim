/**
 * System monitoring tool types
 */

export interface SystemMetrics {
  cpu: {
    usage: number // percentage
    cores: number
    loadAverage: number[]
  }
  memory: {
    total: number // bytes
    used: number // bytes
    free: number // bytes
    percentage: number
  }
  disk: {
    total: number // bytes
    used: number // bytes
    free: number // bytes
    percentage: number
  }
  network: {
    interfaces: NetworkInterface[]
    totalBytesReceived: number
    totalBytesSent: number
  }
}

export interface NetworkInterface {
  name: string
  address: string
  bytesReceived: number
  bytesSent: number
  packetsReceived: number
  packetsSent: number
}

export interface ProcessInfo {
  pid: number
  name: string
  cpuUsage: number
  memoryUsage: number
  status: string
  startTime: string
}

export interface MonitorResponse {
  success: boolean
  timestamp: string
  metrics: SystemMetrics
  processes?: ProcessInfo[]
  alerts?: Alert[]
  error?: string
}

export interface Alert {
  id: string
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'process'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: string
}

export interface MonitoringConfig {
  interval: number // seconds
  thresholds: {
    cpu: number // percentage
    memory: number // percentage
    disk: number // percentage
  }
  enableAlerts: boolean
  enableProcessMonitoring: boolean
}