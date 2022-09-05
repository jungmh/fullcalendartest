import { SubrepoRootConfig } from '@fullcalendar/workspace-scripts/src/subrepo/config'
import {
  generateSubdirLock,
  generateSubdirWorkspace,
} from '@fullcalendar/workspace-scripts/src/subrepo/meta/pnpm'

const commonConfig = {
  copyFiles: [
    '.npmrc',
    '.editorconfig'
  ],
  generateFiles: {
    'pnpm-workspace.yaml': generateSubdirWorkspace,
    'pnpm-lock.yaml': generateSubdirLock,
  },
}

const rootConfig: SubrepoRootConfig = {
  branch: 'workspace-refactor',
  subrepos: {
    'standard': {
      remote: 'git@github.com:fullcalendar/fullcalendar.git',
      ...commonConfig,
    },
    'examples': {
      remote: 'git@github.com:fullcalendar/fullcalendar-example-projects.git',
      ...commonConfig,
    },
    'contrib/react': {
      remote: 'git@github.com:fullcalendar/fullcalendar-react.git',
      ...commonConfig,
    },
    'contrib/vue2': {
      remote: 'git@github.com:fullcalendar/fullcalendar-vue.git',
      branchOverride: 'vue2-workspace-refactor',
      ...commonConfig,
    },
    'contrib/vue3': {
      remote: 'git@github.com:fullcalendar/fullcalendar-vue.git',
      branchOverride: 'vue3-workspace-refactor',
      ...commonConfig,
    }
  }
}

export default rootConfig