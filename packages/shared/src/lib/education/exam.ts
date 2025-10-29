import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common/base-model'
import { ApId } from '../common/id-generator'
import { Difficulty } from './difficulty'

export enum ExamStatus {
  GENERATED = 'GENERATED',
  SUBMITTED = 'SUBMITTED',
}

export const Exam = Type.Object({
  ...BaseModelSchema,
  projectId: ApId,
  studentId: ApId,
  subjectId: ApId,
  difficulty: Difficulty,
  status: Type.Enum(ExamStatus),
  startedAt: Type.Optional(Type.String()),
  finishedAt: Type.Optional(Type.String()),
  scoreCorrect: Type.Integer(),
  scoreTotal: Type.Integer(),
})

export type Exam = Static<typeof Exam>

export const ExamQuestion = Type.Object({
  ...BaseModelSchema,
  examId: ApId,
  questionId: ApId,
  position: Type.Integer(),
  selectedIndex: Type.Optional(Type.Integer({ minimum: 0, maximum: 3 })),
  isCorrect: Type.Optional(Type.Boolean()),
})

export type ExamQuestion = Static<typeof ExamQuestion>

export const GenerateExamRequest = Type.Object({
  projectId: ApId,
  subjectId: ApId,
  difficulty: Difficulty,
  numQuestions: Type.Integer({ minimum: 1, maximum: 100 }),
})

export type GenerateExamRequest = Static<typeof GenerateExamRequest>

export const SubmitExamRequest = Type.Object({
  answers: Type.Array(Type.Object({
    questionId: ApId,
    selectedIndex: Type.Integer({ minimum: 0, maximum: 3 }),
  })),
})

export type SubmitExamRequest = Static<typeof SubmitExamRequest>

export const StudentDashboard = Type.Object({
  perSubject: Type.Array(Type.Object({
    subjectId: ApId,
    attempts: Type.Integer(),
    avgScore: Type.Number(),
    bestScore: Type.Number(),
    lastAttemptAt: Type.String(),
  })),
  perDifficulty: Type.Array(Type.Object({
    difficulty: Difficulty,
    attempts: Type.Integer(),
    avgScore: Type.Number(),
  })),
  recentExams: Type.Array(Type.Object({
    examId: ApId,
    subjectId: ApId,
    difficulty: Difficulty,
    scoreCorrect: Type.Integer(),
    scoreTotal: Type.Integer(),
    finishedAt: Type.String(),
  })),
})

export type StudentDashboard = Static<typeof StudentDashboard>
