import { useId } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ConfigField,
  ConfigSection,
  CopyableField,
  InstructionsSection,
  TestResultDisplay,
} from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/components/sub-block/components/webhook/components'

interface GithubConfigProps {
  contentType: string
  setContentType: (contentType: string) => void
  webhookSecret: string
  setWebhookSecret: (secret: string) => void
  sslVerification: string
  setSslVerification: (value: string) => void
  isLoadingToken: boolean
  testResult: {
    success: boolean
    message?: string
    test?: any
  } | null
  copied: string | null
  copyToClipboard: (text: string, type: string) => void
  testWebhook: () => Promise<void>
}

export function GithubConfig({
  contentType,
  setContentType,
  webhookSecret,
  setWebhookSecret,
  sslVerification,
  setSslVerification,
  isLoadingToken,
  testResult,
  copied,
  copyToClipboard,
}: GithubConfigProps) {
  const githubContentTypeId = useId()
  const webhookSecretId = useId()
  const githubSslVerificationId = useId()

  return (
    <div className='space-y-4'>
      <ConfigSection title='GitHub Webhook Settings'>
        <ConfigField
          id={githubContentTypeId}
          label='Content Type'
          description='Format GitHub will use when sending the webhook payload.'
        >
          <Select value={contentType} onValueChange={setContentType} disabled={isLoadingToken}>
            <SelectTrigger id={githubContentTypeId}>
              <SelectValue placeholder='Select content type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='application/json'>application/json</SelectItem>
              <SelectItem value='application/x-www-form-urlencoded'>
                application/x-www-form-urlencoded
              </SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField id={webhookSecretId} label='Webhook Secret (Recommended)'>
          <CopyableField
            id={webhookSecretId}
            value={webhookSecret}
            onChange={setWebhookSecret}
            placeholder='Generate or enter a strong secret'
            description='Validates that webhook deliveries originate from GitHub.'
            isLoading={isLoadingToken}
            copied={copied}
            copyType='github-secret'
            copyToClipboard={copyToClipboard}
          />
        </ConfigField>

        <ConfigField
          id={githubSslVerificationId}
          label='SSL Verification'
          description='GitHub verifies SSL certificates when delivering webhooks.'
        >
          <Select
            value={sslVerification}
            onValueChange={setSslVerification}
            disabled={isLoadingToken}
          >
            <SelectTrigger id={githubSslVerificationId}>
              <SelectValue placeholder='Select SSL verification option' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='enabled'>Enabled (Recommended)</SelectItem>
              <SelectItem value='disabled'>Disabled (Use with caution)</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
      </ConfigSection>

      <TestResultDisplay
        testResult={testResult}
        copied={copied}
        copyToClipboard={copyToClipboard}
        showCurlCommand={true} // GitHub webhooks can be tested
      />

      <InstructionsSection tip='GitHub will send a ping event to verify after you add the webhook.'>
        <ol className='list-inside list-decimal space-y-1'>
          <li>
            Go to your GitHub Repository {'>'} Settings {'>'} Webhooks.
          </li>
          <li>Click "Add webhook".</li>
          <li>
            Paste the <strong>Webhook URL</strong> (from above) into the "Payload URL" field.
          </li>
          <li>Select "{contentType}" as the Content type.</li>
          {webhookSecret && (
            <li>
              Enter the <strong>Webhook Secret</strong> (from above) into the "Secret" field.
            </li>
          )}
          <li>Set SSL verification according to your selection above.</li>
          <li>Choose which events should trigger this webhook.</li>
          <li>Ensure "Active" is checked and click "Add webhook".</li>
        </ol>
      </InstructionsSection>
    </div>
  )
}
