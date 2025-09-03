/**
 * Blocks Registry
 *
 */

import { AdvancedConditionBlock } from '@/blocks/blocks/advanced-condition'
import { AgentBlock } from '@/blocks/blocks/agent'
import { AirtableBlock } from '@/blocks/blocks/airtable'
import { ApiBlock } from '@/blocks/blocks/api'
import { ApprovalWorkflowBlock } from '@/blocks/blocks/approval-workflow'
import { ArxivBlock } from '@/blocks/blocks/arxiv'
import { AuthManagerBlock } from '@/blocks/blocks/auth-manager'
import { BrowserUseBlock } from '@/blocks/blocks/browser_use'
import { ClayBlock } from '@/blocks/blocks/clay'
import { ConditionBlock } from '@/blocks/blocks/condition'
import { ConfluenceBlock } from '@/blocks/blocks/confluence'
import { DataTransformerBlock } from '@/blocks/blocks/data-transformer'
import { DiscordBlock } from '@/blocks/blocks/discord'
import { ElevenLabsBlock } from '@/blocks/blocks/elevenlabs'
import { EmailAutomationBlock } from '@/blocks/blocks/email-automation'
import { EvaluatorBlock } from '@/blocks/blocks/evaluator'
import { ExaBlock } from '@/blocks/blocks/exa'
import { FileBlock } from '@/blocks/blocks/file'
import { FileProcessorBlock } from '@/blocks/blocks/file-processor'
import { FirecrawlBlock } from '@/blocks/blocks/firecrawl'
import { FunctionBlock } from '@/blocks/blocks/function'
import { GenericWebhookBlock } from '@/blocks/blocks/generic_webhook'
import { GitHubBlock } from '@/blocks/blocks/github'
import { GmailBlock } from '@/blocks/blocks/gmail'
import { GoogleSearchBlock } from '@/blocks/blocks/google'
import { GoogleCalendarBlock } from '@/blocks/blocks/google_calendar'
import { GoogleDocsBlock } from '@/blocks/blocks/google_docs'
import { GoogleDriveBlock } from '@/blocks/blocks/google_drive'
import { GoogleSheetsBlock } from '@/blocks/blocks/google_sheets'
import { GraphQLApiBlock } from '@/blocks/blocks/graphql-api'
import { HuggingFaceBlock } from '@/blocks/blocks/huggingface'
import { HunterBlock } from '@/blocks/blocks/hunter'
import { ImageGeneratorBlock } from '@/blocks/blocks/image_generator'
import { JavaScriptBlock } from '@/blocks/blocks/javascript'
import { JinaBlock } from '@/blocks/blocks/jina'
import { JiraBlock } from '@/blocks/blocks/jira'
import { KnowledgeBlock } from '@/blocks/blocks/knowledge'
import { LinearBlock } from '@/blocks/blocks/linear'
import { LinkupBlock } from '@/blocks/blocks/linkup'
import { Mem0Block } from '@/blocks/blocks/mem0'
import { MemoryBlock } from '@/blocks/blocks/memory'
import { MicrosoftExcelBlock } from '@/blocks/blocks/microsoft_excel'
import { MicrosoftPlannerBlock } from '@/blocks/blocks/microsoft_planner'
import { MicrosoftTeamsBlock } from '@/blocks/blocks/microsoft_teams'
import { MistralParseBlock } from '@/blocks/blocks/mistral_parse'
import { MySQLBlock } from '@/blocks/blocks/mysql'
import { NotionBlock } from '@/blocks/blocks/notion'
import { OneDriveBlock } from '@/blocks/blocks/onedrive'
import { OpenAIBlock } from '@/blocks/blocks/openai'
import { OutlookBlock } from '@/blocks/blocks/outlook'
import { ParallelBlock } from '@/blocks/blocks/parallel'
import { PdfGeneratorBlock } from '@/blocks/blocks/pdf-generator'
import { PerplexityBlock } from '@/blocks/blocks/perplexity'
import { PineconeBlock } from '@/blocks/blocks/pinecone'
import { PostgreSQLBlock } from '@/blocks/blocks/postgresql'
import { PythonBlock } from '@/blocks/blocks/python'
import { QdrantBlock } from '@/blocks/blocks/qdrant'
import { RedditBlock } from '@/blocks/blocks/reddit'
import { ResponseBlock } from '@/blocks/blocks/response'
// Traditional Automation Blocks
import { RestApiBlock } from '@/blocks/blocks/rest-api'
import { RouterBlock } from '@/blocks/blocks/router'
import { S3Block } from '@/blocks/blocks/s3'
import { ScheduleBlock } from '@/blocks/blocks/schedule'
import { SerperBlock } from '@/blocks/blocks/serper'
import { SharepointBlock } from '@/blocks/blocks/sharepoint'
import { SlackBlock } from '@/blocks/blocks/slack'
import { SqlQueryBuilderBlock } from '@/blocks/blocks/sql-query-builder'
import { StagehandBlock } from '@/blocks/blocks/stagehand'
import { StagehandAgentBlock } from '@/blocks/blocks/stagehand_agent'
import { StarterBlock } from '@/blocks/blocks/starter'
import { SupabaseBlock } from '@/blocks/blocks/supabase'
import { SwitchBlock } from '@/blocks/blocks/switch'
import { SystemMonitorBlock } from '@/blocks/blocks/system-monitor'
import { TavilyBlock } from '@/blocks/blocks/tavily'
import { TelegramBlock } from '@/blocks/blocks/telegram'
import { ThinkingBlock } from '@/blocks/blocks/thinking'
import { TranslateBlock } from '@/blocks/blocks/translate'
import { TwilioSMSBlock } from '@/blocks/blocks/twilio'
import { TypeformBlock } from '@/blocks/blocks/typeform'
import { VisionBlock } from '@/blocks/blocks/vision'
import { WealthboxBlock } from '@/blocks/blocks/wealthbox'
import { WebhookBlock } from '@/blocks/blocks/webhook'
import { WebhookProcessorBlock } from '@/blocks/blocks/webhook-processor'
import { WhatsAppBlock } from '@/blocks/blocks/whatsapp'
import { WikipediaBlock } from '@/blocks/blocks/wikipedia'
import { WorkflowBlock } from '@/blocks/blocks/workflow'
import { XBlock } from '@/blocks/blocks/x'
import { YouTubeBlock } from '@/blocks/blocks/youtube'
import type { BlockConfig } from '@/blocks/types'

// Registry of all available blocks, alphabetically sorted
export const registry: Record<string, BlockConfig> = {
  'advanced-condition': AdvancedConditionBlock,
  agent: AgentBlock,
  airtable: AirtableBlock,
  api: ApiBlock,
  approval_workflow: ApprovalWorkflowBlock,
  arxiv: ArxivBlock,
  auth_manager: AuthManagerBlock,
  browser_use: BrowserUseBlock,
  clay: ClayBlock,
  condition: ConditionBlock,
  confluence: ConfluenceBlock,
  data_transformer: DataTransformerBlock,
  discord: DiscordBlock,
  elevenlabs: ElevenLabsBlock,
  email_automation: EmailAutomationBlock,
  evaluator: EvaluatorBlock,
  exa: ExaBlock,
  file_processor: FileProcessorBlock,
  firecrawl: FirecrawlBlock,
  file: FileBlock,
  function: FunctionBlock,
  generic_webhook: GenericWebhookBlock,
  github: GitHubBlock,
  gmail: GmailBlock,
  google_calendar: GoogleCalendarBlock,
  google_docs: GoogleDocsBlock,
  google_drive: GoogleDriveBlock,
  google_search: GoogleSearchBlock,
  google_sheets: GoogleSheetsBlock,
  graphql_api: GraphQLApiBlock,
  huggingface: HuggingFaceBlock,
  hunter: HunterBlock,
  image_generator: ImageGeneratorBlock,
  javascript: JavaScriptBlock,
  jina: JinaBlock,
  jira: JiraBlock,
  knowledge: KnowledgeBlock,
  linear: LinearBlock,
  linkup: LinkupBlock,
  mem0: Mem0Block,
  microsoft_excel: MicrosoftExcelBlock,
  microsoft_planner: MicrosoftPlannerBlock,
  microsoft_teams: MicrosoftTeamsBlock,
  mistral_parse: MistralParseBlock,
  mysql: MySQLBlock,
  notion: NotionBlock,
  openai: OpenAIBlock,
  outlook: OutlookBlock,
  onedrive: OneDriveBlock,
  parallel_ai: ParallelBlock,
  pdf_generator: PdfGeneratorBlock,
  perplexity: PerplexityBlock,
  pinecone: PineconeBlock,
  postgresql: PostgreSQLBlock,
  python: PythonBlock,
  qdrant: QdrantBlock,
  memory: MemoryBlock,
  reddit: RedditBlock,
  response: ResponseBlock,
  rest_api: RestApiBlock,
  router: RouterBlock,
  schedule: ScheduleBlock,
  s3: S3Block,
  serper: SerperBlock,
  sharepoint: SharepointBlock,
  sql_query_builder: SqlQueryBuilderBlock,
  stagehand: StagehandBlock,
  stagehand_agent: StagehandAgentBlock,
  system_monitor: SystemMonitorBlock,
  slack: SlackBlock,
  starter: StarterBlock,
  supabase: SupabaseBlock,
  switch: SwitchBlock,
  tavily: TavilyBlock,
  telegram: TelegramBlock,
  thinking: ThinkingBlock,
  translate: TranslateBlock,
  twilio_sms: TwilioSMSBlock,
  typeform: TypeformBlock,
  vision: VisionBlock,
  wealthbox: WealthboxBlock,
  webhook: WebhookBlock,
  webhook_processor: WebhookProcessorBlock,
  whatsapp: WhatsAppBlock,
  wikipedia: WikipediaBlock,
  workflow: WorkflowBlock,
  x: XBlock,
  youtube: YouTubeBlock,
}

export const getBlock = (type: string): BlockConfig | undefined => registry[type]

export const getBlocksByCategory = (category: 'blocks' | 'tools' | 'triggers'): BlockConfig[] =>
  Object.values(registry).filter((block) => block.category === category)

export const getAllBlockTypes = (): string[] => Object.keys(registry)

export const isValidBlockType = (type: string): type is string => type in registry

export const getAllBlocks = (): BlockConfig[] => Object.values(registry)
