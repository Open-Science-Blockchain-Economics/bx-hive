import { useState } from 'react'

import { Addr } from '@/components/ds/addr'
import { Chip } from '@/components/ds/badge'
import { Crumbs, CrumbsItem, CrumbsLink, CrumbsList, CrumbsPage, CrumbsSeparator } from '@/components/ds/breadcrumb'
import { Btn } from '@/components/ds/button'
import { Panel } from '@/components/ds/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ds/dialog'
import { Dot } from '@/components/ds/dot'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ds/dropdown-menu'
import { Field } from '@/components/ds/field'
import { Gauge } from '@/components/ds/gauge'
import { HexGrid } from '@/components/ds/hex-grid'
import { HexMark } from '@/components/ds/hex-mark'
import { Input } from '@/components/ds/input'
import { Rule } from '@/components/ds/separator'
import { Spark } from '@/components/ds/spark'
import { Stat } from '@/components/ds/stat'
import { Switch } from '@/components/ds/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ds/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ds/tooltip'
import { Wordmark } from '@/components/ds/wordmark'
import ThemeToggle from '@/components/ThemeToggle'
import { type Accent, useTheme } from '@/providers/ThemeProvider'

const ACCENTS: Accent[] = ['cyan', 'amber', 'hive', 'ink']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Rule label={title} />
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  )
}

export default function DesignSystemShowcase() {
  const { accent, setAccent } = useTheme()
  const [switchOn, setSwitchOn] = useState(true)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground p-10 font-ui">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Wordmark size={22} />
            <span className="t-micro">Design system showcase</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="t-micro">Accent</span>
            <div className="inline-flex items-center gap-1">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccent(a)}
                  data-active={accent === a}
                  className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] border border-border rounded-sm text-muted-foreground hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:border-primary/35"
                >
                  {a}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-col gap-12">
          <Section title="Buttons">
            <div className="flex flex-col gap-3">
              <span className="t-micro">primary</span>
              <div className="flex items-center gap-3">
                <Btn variant="primary" size="sm">
                  Small
                </Btn>
                <Btn variant="primary" size="md">
                  Medium
                </Btn>
                <Btn variant="primary" size="lg">
                  Large
                </Btn>
                <Btn variant="primary" disabled>
                  Disabled
                </Btn>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="t-micro">secondary</span>
              <div className="flex items-center gap-3">
                <Btn variant="secondary" size="sm">
                  Small
                </Btn>
                <Btn variant="secondary" size="md">
                  Medium
                </Btn>
                <Btn variant="secondary" size="lg">
                  Large
                </Btn>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="t-micro">ghost / danger</span>
              <div className="flex items-center gap-3">
                <Btn variant="ghost">Ghost</Btn>
                <Btn variant="danger">Danger</Btn>
              </div>
            </div>
          </Section>

          <Section title="Chips">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>neutral</Chip>
              <Chip tone="accent">accent</Chip>
              <Chip tone="pos">live</Chip>
              <Chip tone="warn">pending</Chip>
              <Chip tone="neg">error</Chip>
              <Chip tone="info">info</Chip>
            </div>
          </Section>

          <Section title="Dots">
            <div className="flex items-center gap-4 t-small">
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="pos" /> pos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="warn" /> warn
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="neg" /> neg
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="info" /> info
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="accent" /> accent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot tone="muted" /> muted
              </span>
            </div>
          </Section>

          <Section title="Panels">
            <Panel className="w-72">
              <h3 className="t-h2 mb-1">Padded panel</h3>
              <p className="t-small text-muted-foreground">Default 20px padding, hairline border, no shadow.</p>
            </Panel>
            <Panel className="w-72" padded={false}>
              <div className="border-b border-border p-4">
                <h3 className="t-h2">Header section</h3>
              </div>
              <div className="p-4 t-small text-muted-foreground">Custom internal divisions when padded=false.</div>
            </Panel>
          </Section>

          <Section title="Fields & inputs">
            <Field label="Display name" hint="public" required htmlFor="name" className="w-72">
              <Input id="name" placeholder="Jane Researcher" />
            </Field>
            <Field label="Algorand address" htmlFor="addr" className="w-96">
              <Input id="addr" mono placeholder="ALGO•ABCD…7F2C" defaultValue="ALGOXYZ7F2C" />
            </Field>
            <Field label="Amount" hint="ALGO" htmlFor="amt" className="w-44">
              <Input id="amt" mono placeholder="100" />
            </Field>
            <Field label="Email" htmlFor="email" error="Required" className="w-72">
              <Input id="email" aria-invalid placeholder="you@lab.org" />
            </Field>
          </Section>

          <Section title="Rules">
            <div className="w-96">
              <Rule />
              <Rule className="mt-4" label="Section label" />
            </div>
          </Section>

          <Section title="Breadcrumb (Crumbs)">
            <Crumbs>
              <CrumbsList>
                <CrumbsItem>
                  <CrumbsLink href="#">Home</CrumbsLink>
                </CrumbsItem>
                <CrumbsSeparator />
                <CrumbsItem>
                  <CrumbsLink href="#">Dashboard</CrumbsLink>
                </CrumbsItem>
                <CrumbsSeparator />
                <CrumbsItem>
                  <CrumbsPage>Test 1</CrumbsPage>
                </CrumbsItem>
              </CrumbsList>
            </Crumbs>
          </Section>

          <Section title="Tabs">
            <Tabs defaultValue="overview" className="w-96">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="variations">Variations</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <p className="t-small text-muted-foreground mt-4">Overview content.</p>
              </TabsContent>
              <TabsContent value="variations">
                <p className="t-small text-muted-foreground mt-4">Variation list.</p>
              </TabsContent>
              <TabsContent value="participants">
                <p className="t-small text-muted-foreground mt-4">Enrolled participants.</p>
              </TabsContent>
            </Tabs>
          </Section>

          <Section title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Btn variant="secondary">Open dialog</Btn>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign &amp; submit</DialogTitle>
                  <DialogDescription>Confirm your decision before broadcasting on-chain.</DialogDescription>
                </DialogHeader>
                <p className="t-small text-muted-foreground">Once submitted, the round closes immediately.</p>
                <DialogFooter showCloseButton>
                  <Btn variant="primary">Sign &amp; submit</Btn>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>

          <Section title="Dropdown menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn variant="secondary">Account ▾</Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Signed in</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Disconnect</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          <Section title="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Btn variant="ghost">Hover for tooltip</Btn>
              </TooltipTrigger>
              <TooltipContent>Verifiable on-chain</TooltipContent>
            </Tooltip>
          </Section>

          <Section title="Switch">
            <label className="inline-flex items-center gap-3 t-small">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              Auto-match
            </label>
            <label className="inline-flex items-center gap-3 t-small">
              <Switch size="sm" />
              Compact
            </label>
          </Section>

          <Section title="Stats">
            <Stat label="Active" value="6" />
            <Stat label="Participants" value="124" sub="across 4 experiments" />
            <Stat label="Total payout" value="320" unit="ALGO" />
            <Stat label="Right aligned" value="42" align="right" />
          </Section>

          <Section title="Address">
            <Addr value="ALGOABCD…SEG4" />
            <Addr value="ALGOFYXH…UXRI" />
          </Section>

          <Section title="Gauge">
            <Gauge value={25} />
            <Gauge value={50} />
            <Gauge value={75} />
            <Gauge value={100} size={96} />
          </Section>

          <Section title="Spark">
            <Spark />
            <Spark data={[12, 9, 14, 8, 15, 10, 16, 11]} />
          </Section>

          <Section title="HexMark / Wordmark / HexGrid">
            <div className="flex items-center gap-6 text-foreground">
              <HexMark size={32} />
              <Wordmark size={28} />
            </div>
            <Panel className="relative w-72 h-32 overflow-hidden">
              <HexGrid opacity={0.5} />
              <span className="relative t-micro">HexGrid background</span>
            </Panel>
          </Section>
        </div>
      </div>
    </TooltipProvider>
  )
}
