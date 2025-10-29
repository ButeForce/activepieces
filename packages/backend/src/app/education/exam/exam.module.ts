import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { examController } from './exam.controller'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'

export const examModule: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
  await app.register(examController, { prefix: '/v1/exams' })
}
