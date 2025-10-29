import { FastifyPluginCallbackTypebox, Type } from '@fastify/type-provider-typebox'
import { ApId, CreateQuestionRequest, PrincipalType, Question, UpdateQuestionRequest } from '@activepieces/shared'
import { questionService } from './question.service'

export const questionController: FastifyPluginCallbackTypebox = (app, _opts, done) => {
  app.post('/', CreateQuestionRoute, async (request, reply) => {
    const teacherId = request.principal.id
    const created = await questionService.create({
      projectId: request.body.projectId,
      subjectId: request.body.subjectId,
      teacherId,
      text: request.body.text,
      choices: request.body.choices,
      correctIndex: request.body.correctIndex,
      difficulty: request.body.difficulty,
    })
    await reply.send(created)
  })

  app.get('/', ListQuestionsRoute, async (request) => {
    const { projectId, subjectId, difficulty, mine } = request.query
    const res = await questionService.list({
      projectId,
      subjectId,
      difficulty,
      mineOnly: mine ?? false,
      teacherId: request.principal.id,
    })
    return res
  })

  app.patch('/:id', UpdateQuestionRoute, async (request) => {
    return questionService.update({
      id: request.params.id,
      projectId: request.body.projectId,
      teacherId: request.principal.id,
      ...request.body,
    })
  })

  app.delete('/:id', DeleteQuestionRoute, async (request, reply) => {
    await questionService.delete({ id: request.params.id, projectId: request.query.projectId, teacherId: request.principal.id })
    await reply.send()
  })

  done()
}

const CreateQuestionRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['questions'],
    body: CreateQuestionRequest,
    response: {
      200: Question,
    },
  },
}

const ListQuestionsRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['questions'],
    querystring: Type.Object({
      projectId: ApId,
      subjectId: ApId,
      difficulty: Type.Optional(Type.String()),
      mine: Type.Optional(Type.Boolean()),
    }),
    response: {
      200: Type.Array(Question),
    },
  },
}

const UpdateQuestionRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['questions'],
    params: Type.Object({ id: ApId }),
    body: UpdateQuestionRequest as any,
    response: {
      200: Question,
    },
  },
}

const DeleteQuestionRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['questions'],
    params: Type.Object({ id: ApId }),
    querystring: Type.Object({ projectId: ApId }),
  },
}
