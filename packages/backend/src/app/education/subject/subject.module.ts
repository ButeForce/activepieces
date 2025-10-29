import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { subjectController } from './subject.controller'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'

export const subjectModule: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
  await app.register(subjectController, { prefix: '/v1/subjects' })
}
