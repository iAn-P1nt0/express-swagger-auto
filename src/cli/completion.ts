/**
 * Shell Completion Generator
 * Generates completion scripts for bash, zsh, fish, and PowerShell
 */

import { Command } from 'commander';

export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell';

interface CommandInfo {
  name: string;
  description: string;
  options: { flags: string; description: string }[];
  arguments: { name: string; description: string }[];
}

/**
 * Extract command information from a Commander program
 */
function extractCommands(program: Command): CommandInfo[] {
  const commands: CommandInfo[] = [];

  for (const cmd of program.commands) {
    const options = cmd.options.map((opt: any) => ({
      flags: opt.flags,
      description: opt.description || '',
    }));

    const args = (cmd as any)._args?.map((arg: any) => ({
      name: arg.name(),
      description: arg.description || '',
    })) || [];

    commands.push({
      name: cmd.name(),
      description: cmd.description() || '',
      options,
      arguments: args,
    });
  }

  return commands;
}

/**
 * Generate Bash completion script
 */
export function generateBashCompletion(program: Command): string {
  const commands = extractCommands(program);
  const commandNames = commands.map((c) => c.name).join(' ');

  let script = `#!/bin/bash
# express-swagger-auto bash completion
# Install: express-swagger-auto completion bash >> ~/.bashrc && source ~/.bashrc

_express_swagger_auto_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${commandNames}"

  # Handle main command completion
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands} --help --version" -- \${cur}) )
    return 0
  fi

  # Handle subcommand options
  case "\${COMP_WORDS[1]}" in
`;

  for (const cmd of commands) {
    const optionFlags = cmd.options
      .map((opt) => {
        const flags = opt.flags.split(/[,\s]+/).filter((f) => f.startsWith('-'));
        return flags.join(' ');
      })
      .join(' ');

    script += `    ${cmd.name})
      COMPREPLY=( $(compgen -f -W "${optionFlags} --help" -- \${cur}) )
      return 0
      ;;
`;
  }

  script += `    *)
      COMPREPLY=( $(compgen -f -- \${cur}) )
      return 0
      ;;
  esac
}

complete -F _express_swagger_auto_completions express-swagger-auto
`;

  return script;
}

/**
 * Generate Zsh completion script
 */
export function generateZshCompletion(program: Command): string {
  const commands = extractCommands(program);

  let script = `#compdef express-swagger-auto
# express-swagger-auto zsh completion
# Install: express-swagger-auto completion zsh >> ~/.zshrc && source ~/.zshrc

_express_swagger_auto() {
  local -a commands
  local -a options

  commands=(
`;

  for (const cmd of commands) {
    const escapedDesc = cmd.description.replace(/'/g, "'\\''");
    script += `    '${cmd.name}:${escapedDesc}'\n`;
  }

  script += `  )

  _arguments -C \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[2] in
`;

  for (const cmd of commands) {
    script += `        ${cmd.name})
          _arguments \\
`;
    for (const opt of cmd.options) {
      const flags = opt.flags.split(/[,\s]+/).filter((f) => f.startsWith('-'));
      const shortFlag = flags.find((f) => f.startsWith('-') && !f.startsWith('--'));
      const longFlag = flags.find((f) => f.startsWith('--'));
      const escapedDesc = opt.description.replace(/'/g, "'\\''");

      if (longFlag) {
        script += `            '${longFlag}[${escapedDesc}]' \\\n`;
      }
      if (shortFlag && shortFlag !== longFlag) {
        script += `            '${shortFlag}[${escapedDesc}]' \\\n`;
      }
    }
    script += `            '*:file:_files'
          ;;
`;
  }

  script += `      esac
      ;;
  esac
}

_express_swagger_auto "$@"
`;

  return script;
}

/**
 * Generate Fish completion script
 */
export function generateFishCompletion(program: Command): string {
  const commands = extractCommands(program);

  let script = `# express-swagger-auto fish completion
# Install: express-swagger-auto completion fish > ~/.config/fish/completions/express-swagger-auto.fish

# Disable file completion by default
complete -c express-swagger-auto -f

# Main commands
`;

  for (const cmd of commands) {
    const escapedDesc = cmd.description.replace(/'/g, "\\'");
    script += `complete -c express-swagger-auto -n "__fish_use_subcommand" -a "${cmd.name}" -d '${escapedDesc}'\n`;
  }

  script += `
# Global options
complete -c express-swagger-auto -n "__fish_use_subcommand" -s h -l help -d 'Display help'
complete -c express-swagger-auto -n "__fish_use_subcommand" -s v -l version -d 'Display version'

`;

  for (const cmd of commands) {
    script += `# ${cmd.name} command options\n`;

    for (const opt of cmd.options) {
      const flags = opt.flags.split(/[,\s]+/).filter((f) => f.startsWith('-'));
      const shortFlag = flags.find((f) => f.startsWith('-') && !f.startsWith('--'))?.replace('-', '');
      const longFlag = flags.find((f) => f.startsWith('--'))?.replace('--', '');
      const escapedDesc = opt.description.replace(/'/g, "\\'");

      let completion = `complete -c express-swagger-auto -n "__fish_seen_subcommand_from ${cmd.name}"`;

      if (shortFlag) {
        completion += ` -s ${shortFlag}`;
      }
      if (longFlag) {
        completion += ` -l ${longFlag}`;
      }
      completion += ` -d '${escapedDesc}'`;

      script += completion + '\n';
    }

    // Add file completion for arguments
    if (cmd.arguments.length > 0) {
      script += `complete -c express-swagger-auto -n "__fish_seen_subcommand_from ${cmd.name}" -F\n`;
    }

    script += '\n';
  }

  return script;
}

/**
 * Generate PowerShell completion script
 */
export function generatePowerShellCompletion(program: Command): string {
  const commands = extractCommands(program);

  let script = `# express-swagger-auto PowerShell completion
# Install: express-swagger-auto completion powershell >> $PROFILE

$scriptBlock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(
`;

  for (const cmd of commands) {
    const escapedDesc = cmd.description.replace(/'/g, "''");
    script += `        @{ Name = '${cmd.name}'; Description = '${escapedDesc}' }\n`;
  }

  script += `    )

    $commandOptions = @{
`;

  for (const cmd of commands) {
    const optionsList = cmd.options
      .map((opt) => {
        const longFlag = opt.flags.split(/[,\s]+/).find((f) => f.startsWith('--'));
        return longFlag ? `'${longFlag}'` : null;
      })
      .filter(Boolean)
      .join(', ');

    script += `        '${cmd.name}' = @(${optionsList})\n`;
  }

  script += `    }

    $commandElements = $commandAst.CommandElements
    $command = $null

    for ($i = 1; $i -lt $commandElements.Count; $i++) {
        $element = $commandElements[$i].Extent.Text
        if ($commands.Name -contains $element) {
            $command = $element
            break
        }
    }

    if ($null -eq $command) {
        # Complete commands
        $commands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.Description
            )
        }
    } else {
        # Complete options for the command
        $options = $commandOptions[$command]
        $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_,
                $_,
                'ParameterName',
                "Option for $command"
            )
        }
    }
}

Register-ArgumentCompleter -Native -CommandName express-swagger-auto -ScriptBlock $scriptBlock
`;

  return script;
}

/**
 * Get completion script for specified shell
 */
export function getCompletionScript(program: Command, shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion(program);
    case 'zsh':
      return generateZshCompletion(program);
    case 'fish':
      return generateFishCompletion(program);
    case 'powershell':
      return generatePowerShellCompletion(program);
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}
