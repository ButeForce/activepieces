import { FastifyPluginCallbackTypebox, Type } from '@fastify/type-provider-typebox'
import { ApId, GenerateExamRequest, PrincipalType, SubmitExamRequest } from '@activepieces/shared'
import { examService } from './exam.service'

export const examController: FastifyPluginCallbackTypebox = (app, _opts, done) => {
  app.post('/', GenerateExamRoute, async (request) => {
    const studentId = request.principal.id
    const { projectId, subjectId, difficulty, numQuestions } = request.body
    return examService.generate({ projectId, studentId, subjectId, difficulty, numQuestions })
  })

  app.get('/:id', GetExamRoute, async (request) => {
    const studentId = request.principal.id
    const { projectId } = request.query
    return examService.getOneForStudent({ projectId, studentId, examId: request.params.id })
  })

  app.post('/:id/submit', SubmitExamRoute, async (request) => {
    const studentId = request.principal.id
    const { projectId } = request.query
    return examService.submit({ projectId, studentId, examId: request.params.id, answers: request.body.answers })
  })

  app.get('/me/dashboard', DashboardRoute, async (request) => {
    const studentId = request.principal.id
    const { projectId, limitRecent } = request.query
    return examService.dashboard({ projectId, studentId, limitRecent })
  })

  done()
}

const GenerateExamRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['exams'],
    body: GenerateExamRequest,
  },
}

const GetExamRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['exams'],
    params: Type.Object({ id: ApId }),
    querystring: Type.Object({ projectId: ApId }),
  },
}

const SubmitExamRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['exams'],
    params: Type.Object({ id: ApId }),
    querystring: Type.Object({ projectId: ApId }),
    body: SubmitExamRequest,
  },
}

const DashboardRoute = {
  config: { allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE] },
  schema: {
    tags: ['exams'],
    querystring: Type.Object({ projectId: ApId, limitRecent: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })) }),
  },
}
