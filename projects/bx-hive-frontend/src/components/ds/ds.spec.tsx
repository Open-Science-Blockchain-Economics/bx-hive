import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Addr } from './addr'
import { Chip } from './badge'
import { Crumbs, CrumbsItem, CrumbsLink, CrumbsList, CrumbsPage, CrumbsSeparator } from './breadcrumb'
import { Btn } from './button'
import { Panel } from './card'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog'
import { Dot } from './dot'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'
import { Field } from './field'
import { Gauge } from './gauge'
import { HexGrid } from './hex-grid'
import { HexMark } from './hex-mark'
import { Input } from './input'
import { Rule } from './separator'
import { Spark } from './spark'
import { Stat } from './stat'
import { Switch } from './switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { Wordmark } from './wordmark'

describe('Btn', () => {
  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('variant=%s renders children', (variant) => {
    render(<Btn variant={variant}>Press</Btn>)
    expect(screen.getByRole('button', { name: 'Press' })).toBeInTheDocument()
  })

  it.each(['sm', 'md', 'lg'] as const)('size=%s renders', (size) => {
    render(<Btn size={size}>X</Btn>)
    expect(screen.getByRole('button', { name: 'X' })).toBeInTheDocument()
  })

  it('respects disabled', () => {
    render(<Btn disabled>Off</Btn>)
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled()
  })
})

describe('Chip', () => {
  it.each(['neutral', 'accent', 'pos', 'warn', 'neg', 'info'] as const)('tone=%s renders', (tone) => {
    render(<Chip tone={tone}>tag</Chip>)
    expect(screen.getByText('tag')).toBeInTheDocument()
  })
})

describe('Panel', () => {
  it('renders with default padding', () => {
    render(<Panel>body</Panel>)
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('renders with padded={false}', () => {
    render(<Panel padded={false}>flush</Panel>)
    expect(screen.getByText('flush')).toBeInTheDocument()
  })
})

describe('Field + Input', () => {
  it('renders label, hint, required, and child input', () => {
    render(
      <Field label="Name" hint="public" required htmlFor="x">
        <Input id="x" placeholder="value" />
      </Field>,
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('public')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('value')).toBeInTheDocument()
  })

  it('renders error message when error prop is set', () => {
    render(
      <Field label="Email" error="Required">
        <Input />
      </Field>,
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('Input mono prop applies font-mono class', () => {
    const { container } = render(<Input mono />)
    const input = container.querySelector('input')!
    expect(input.className).toContain('font-mono')
  })
})

describe('Rule', () => {
  it('renders an unlabeled separator', () => {
    render(<Rule />)
    expect(document.querySelector('[data-slot="rule"]')).toBeInTheDocument()
  })

  it('renders a labeled rule', () => {
    render(<Rule label="Section" />)
    expect(screen.getByText('Section')).toBeInTheDocument()
  })
})

describe('Crumbs', () => {
  it('renders breadcrumb trail with default separator', () => {
    render(
      <Crumbs>
        <CrumbsList>
          <CrumbsItem>
            <CrumbsLink href="#">Home</CrumbsLink>
          </CrumbsItem>
          <CrumbsSeparator />
          <CrumbsItem>
            <CrumbsPage>Page</CrumbsPage>
          </CrumbsItem>
        </CrumbsList>
      </Crumbs>,
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Page')).toBeInTheDocument()
    expect(screen.getByText('/')).toBeInTheDocument()
  })
})

describe('Stat', () => {
  it('renders label and value', () => {
    render(<Stat label="Active" value="6" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('renders unit and sub when provided', () => {
    render(<Stat label="Total" value="320" unit="ALGO" sub="lifetime" />)
    expect(screen.getByText('ALGO')).toBeInTheDocument()
    expect(screen.getByText('lifetime')).toBeInTheDocument()
  })
})

describe('Dot', () => {
  it.each(['pos', 'warn', 'neg', 'info', 'accent', 'muted'] as const)('tone=%s renders', (tone) => {
    const { container } = render(<Dot tone={tone} />)
    expect(container.querySelector(`[data-tone="${tone}"]`)).toBeInTheDocument()
  })
})

describe('Addr', () => {
  it('renders the address value', () => {
    render(<Addr value="ALGO•7F2C" />)
    expect(screen.getByText('ALGO•7F2C')).toBeInTheDocument()
  })
})

describe('Gauge', () => {
  it.each([0, 25, 50, 100])('value=%s renders', (value) => {
    render(<Gauge value={value} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', String(value))
  })
})

describe('Spark', () => {
  it('renders default sparkline', () => {
    const { container } = render(<Spark />)
    expect(container.querySelector('[data-slot="spark"]')).toBeInTheDocument()
  })

  it('renders custom data', () => {
    const { container } = render(<Spark data={[1, 2, 3, 4]} />)
    expect(container.querySelector('polyline')).toBeInTheDocument()
  })
})

describe('Brand primitives', () => {
  it('HexMark renders an svg', () => {
    const { container } = render(<HexMark />)
    expect(container.querySelector('[data-slot="hex-mark"]')).toBeInTheDocument()
  })

  it('Wordmark renders bxHive', () => {
    render(<Wordmark />)
    expect(screen.getByText(/bxHive/)).toBeInTheDocument()
  })

  it('HexGrid renders a pattern svg', () => {
    const { container } = render(<HexGrid />)
    expect(container.querySelector('[data-slot="hex-grid"]')).toBeInTheDocument()
  })
})

describe('Structural primitives smoke tests', () => {
  it('Tabs renders triggers and default content', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
        <TabsContent value="b">B content</TabsContent>
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByText('A content')).toBeInTheDocument()
  })

  it('Dialog renders trigger (closed by default)', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('DropdownMenu renders trigger (closed by default)', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('Tooltip renders trigger inside provider', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Info</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    expect(screen.getByRole('button', { name: 'Hover' })).toBeInTheDocument()
  })

  it('Switch renders an unchecked switch by default', () => {
    render(<Switch />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })
})
