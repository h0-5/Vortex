import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vortex/ui';
import {
  DatabaseIcon,
  FileTextIcon,
  KeyRoundIcon,
  MessageSquareCodeIcon,
  RadioTowerIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SmileIcon,
  TerminalSquareIcon,
  WorkflowIcon,
  LayoutTemplateIcon,
} from 'lucide-react';

import { PageHeader } from '../components/page-header.js';
import { useGuildWorkspace } from '../hooks/use-guild-workspace.js';

const coreApis = [
  {
    name: 'Commands API',
    status: 'Stable',
    icon: TerminalSquareIcon,
    description: 'Register slash and prefix commands with guild-scoped customization and permissions.',
    snippet: "await ctx.commands.register({ name: 'ping', type: 'BOTH', handler });",
  },
  {
    name: 'Events API',
    status: 'Stable',
    icon: RadioTowerIcon,
    description: 'Subscribe to Discord runtime events without exposing raw client access to plugins.',
    snippet: "ctx.events.on('guildMemberAdd', async (event) => { /* ... */ });",
  },
  {
    name: 'Variables API',
    status: 'Stable',
    icon: KeyRoundIcon,
    description: 'Resolve plugin text placeholders with safe fallback behavior.',
    snippet: "ctx.variables.resolve('Hello [userName]', data);",
  },
  {
    name: 'Templates API',
    status: 'Stable',
    icon: FileTextIcon,
    description: 'Store named, versioned message templates scoped to a guild and plugin.',
    snippet: "await ctx.templates.save({ name, type, contentMode, content });",
  },
  {
    name: 'Message Builder API',
    status: 'Stable',
    icon: MessageSquareCodeIcon,
    description: 'Validate text, embed, and Components V2 message payloads before delivery.',
    snippet: "const message = ctx.messages.build({ type: 'text', content });",
  },
  {
    name: 'Emoji Picker API',
    status: 'Stable',
    icon: SmileIcon,
    description: 'Provide default and guild emoji sources to plugin dashboards.',
    snippet: "onEmojiSelect((emoji) => insertText(emoji.value));",
  },
  {
    name: 'Visual Editor API',
    status: 'Available',
    icon: WorkflowIcon,
    description: 'Build visual card layouts as a generic JSON document for plugins that opt in.',
    snippet: "const layout = visualEditor.exportLayout();",
  },
  {
    name: 'Logs API',
    status: 'Stable',
    icon: ScrollTextIcon,
    description: 'Write dashboard and Discord log entries through a central scoped logger.',
    snippet: "await ctx.logger.audit('Settings updated', { category: 'settings' });",
  },
  {
    name: 'Storage API',
    status: 'Stable',
    icon: DatabaseIcon,
    description: 'Persist plugin-owned key/value data without leaking global tables.',
    snippet: "await ctx.storage.set('settings/main', settings);",
  },
  {
    name: 'Permissions API',
    status: 'Stable',
    icon: ShieldCheckIcon,
    description: 'Check plugin management and command execution permissions consistently.',
    snippet: "await ctx.permissions.canRunCommand(commandId, member, channelId);",
  },
  {
    name: 'Plugin UI API',
    status: 'Required',
    icon: LayoutTemplateIcon,
    description: 'Plugin dashboards must use Core UI primitives for shells, tabs, actions, forms, modals, empty states, composers, and previews.',
    snippet: "<PluginSection actions={[{ id: 'save', label: 'Save', variant: 'primary' }]} />",
  },
];

export function CoreApisPage() {
  const { guild } = useGuildWorkspace();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={guild.data?.name ?? 'Developer'}
        title="Core APIs"
        description="Read-only developer documentation for the generic Vortex plugin runtime. Plugin configuration lives inside each plugin dashboard."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {coreApis.map((api) => (
          <Card key={api.name} className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <api.icon className="size-4" />
                  </span>
                  <div>
                    <CardTitle className="text-sm">{api.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{api.description}</p>
                  </div>
                </div>
                <Badge variant="outline">{api.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="bg-muted/20 px-5 py-4">
              <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <code>{api.snippet}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-sm">Plugin UI governance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Plugins provide labels, icons, variants, handlers, disabled/loading state, and confirmation text. Core renders page shells, tabs, cards, modals, empty states, action buttons, save bars, message composers, and preview panels. Custom plugin-owned save buttons, destructive buttons, page shells, tabs, modals, empty states, composers, and preview panels require explicit Core UI approval.
        </CardContent>
      </Card>
    </div>
  );
}
