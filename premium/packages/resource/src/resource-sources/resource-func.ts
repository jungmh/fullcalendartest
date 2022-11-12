import { unpromisify } from '@fullcalendar/core/internal'
import { ResourceSourceError } from '../structs/resource-source.js'
import { registerResourceSourceDef } from '../structs/resource-source-def.js'
import { ResourceInput } from '../structs/resource.js'
import { ResourceSourceRefined } from '../structs/resource-source-parse.js'

export interface ResourceFuncArg {
  start?: Date
  end?: Date
  startStr?: string
  endStr?: string
  timeZone?: string
}

export type ResourceFunc = (
  arg: ResourceFuncArg,
  successCallback: (events: ResourceInput[]) => void,
  failureCallback: (errorObj: ResourceSourceError) => void
) => any // TODO: promise-like object or nothing

registerResourceSourceDef<ResourceFunc>({

  parseMeta(refined: ResourceSourceRefined) {
    if (typeof refined.resources === 'function') {
      return refined.resources
    }
    return null
  },

  fetch(arg, success, failure) {
    let dateEnv = arg.context.dateEnv
    let func = arg.resourceSource.meta

    let publicArg: ResourceFuncArg = arg.range ? {
      start: dateEnv.toDate(arg.range.start),
      end: dateEnv.toDate(arg.range.end),
      startStr: dateEnv.formatIso(arg.range.start),
      endStr: dateEnv.formatIso(arg.range.end),
      timeZone: dateEnv.timeZone,
    } : {}

    // TODO: make more dry with EventSourceFunc
    // TODO: accept a response?
    unpromisify(
      func.bind(null, publicArg),
      (rawResources) => { // success
        success({ rawResources }) // needs an object response
      },
      failure, // send errorObj directly to failure callback
    )
  },

})
