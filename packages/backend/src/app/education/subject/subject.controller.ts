import { FastifyPluginCallbackTypebox, Type } from '@fastify/type-provider-typebox'
import { PrincipalType, ApId } from '@activepieces/shared'
import { subjectService } from './subject.service'

export const subjectController: FastifyPluginCallbackTypebox = (app, _opts, done) => {
  app.get('/', ListSubjectsRequest, async (request) => {
    const { projectId, grade } = request.query
    return subjectService.listByGrade({ projectId, grade })
  })

  app.post('/', CreateSubjectRequest, async (request) => {
    const { projectId, name, grade } = request.body
    return subjectService.create({ projectId, name, grade })
  })

  done()
}

const ListSubjectsRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['subjects'],
    querystring: Type.Object({
      projectId: ApId,
      grade: Type.String(),
    }),
  },
}

const CreateSubjectRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['subjects'],
    body: Type.Object({
      projectId: ApId,
      name: Type.String(),
      grade: Type.String(),
    }),
  },
}
