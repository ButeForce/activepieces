import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { questionController } from './question.controller'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'

export const questionModule: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
  await app.register(questionController, { prefix: '/v1/questions' })
}
