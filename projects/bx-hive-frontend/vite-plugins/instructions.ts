import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_PREFIX = 'virtual:instructions/'
const RESOLVED_PREFIX = '\0virtual:instructions/'

interface InstructionsPluginOptions {
  /** Absolute path to the contracts project root */
  contractsDir: string
}

/**
 * Vite plugin that exposes contract instruction markdown files as virtual modules.
 *
 * Usage:
 *   import content from 'virtual:instructions/trust-variation/investor'
 *
 * The module ID after `virtual:instructions/` maps to:
 *   <contractsDir>/smart_contracts/<path>.md
 */
export function instructionsPlugin(options: InstructionsPluginOptions): Plugin {
  function resolveFilePathClean(id: string): string {
    // id is e.g. "trust-variation/investor"
    // maps to: <contractsDir>/smart_contracts/trust_variation/instructions/investor.md
    const parts = id.split('/')
    const contractDir = parts[0].replace(/-/g, '_') // trust-variation -> trust_variation
    const fileName = parts.slice(1).join('/')
    return path.join(options.contractsDir, 'smart_contracts', contractDir, 'instructions', `${fileName}.md`)
  }

  function stripFrontmatter(content: string): string {
    return content.replace(/^---[\s\S]*?---\n*/, '')
  }

  return {
    name: 'vite-plugin-instructions',

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length)
      }
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return

      const moduleId = id.slice(RESOLVED_PREFIX.length)
      const filePath = resolveFilePathClean(moduleId)

      if (!fs.existsSync(filePath)) {
        this.warn(`Instruction file not found: ${filePath}`)
        return `export default ${JSON.stringify('Instructions not available.')}`
      }

      this.addWatchFile(filePath)

      const raw = fs.readFileSync(filePath, 'utf-8')
      const content = stripFrontmatter(raw)

      return `export default ${JSON.stringify(content)}`
    },
  }
}