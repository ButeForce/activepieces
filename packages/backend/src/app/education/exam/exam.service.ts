import { databaseConnection } from '../../database/database-connection'
import { ExamEntity, ExamSchema } from './exam.entity'
import { ExamQuestionEntity, ExamQuestionSchema } from './exam-question.entity'
import { questionService } from '../question/question.service'
import { apId } from '@activepieces/shared'

const examRepo = databaseConnection.getRepository(ExamEntity)
const eqRepo = databaseConnection.getRepository(ExamQuestionEntity)

export const examService = {
  async generate(params: GenerateParams): Promise<{ exam: ExamSchema; questions: ExamQuestionView[] }> {
    const { projectId, studentId, subjectId, difficulty, numQuestions } = params

    const picked = await questionService.randomSample({
      projectId,
      subjectId,
      difficulty,
      limit: numQuestions,
    })

    const exam: ExamSchema = {
      id: apId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      projectId,
      studentId,
      subjectId,
      difficulty,
      status: 'GENERATED',
      startedAt: new Date().toISOString(),
      scoreCorrect: 0,
      scoreTotal: picked.length,
    }

    await examRepo.insert(exam)

    const eqs: ExamQuestionSchema[] = picked.map((q, idx) => ({
      id: apId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      examId: exam.id,
      questionId: q.id,
      position: idx + 1,
      selectedIndex: null,
      isCorrect: null,
    }))

    if (eqs.length) {
      await eqRepo.insert(eqs)
    }

    const view = picked.map((q, idx) => ({
      position: idx + 1,
      questionId: q.id,
      text: q.text,
      choices: q.choices,
    }))

    return { exam, questions: view }
  },

  async getOneForStudent(params: GetExamParams): Promise<{ exam: ExamSchema; questions: ExamQuestionView[] }> {
    const { projectId, studentId, examId } = params
    const exam = await examRepo.findOneByOrFail({ id: examId, projectId, studentId })

    const eqs = await eqRepo.findBy({ examId: exam.id })

    // Fetch questions content
    const questionIds = eqs.map((e) => e.questionId)
    // reuse questionService.list by subject? Not necessary; we need arbitrary ids
    const qb = databaseConnection.getRepository('question').createQueryBuilder('q').whereInIds(questionIds)
    const questions = await qb.getMany()

    const byId = new Map(questions.map((q: any) => [q.id, q]))

    const view: ExamQuestionView[] = eqs
      .sort((a, b) => a.position - b.position)
      .map((e) => {
        const q = byId.get(e.questionId)
        return {
          position: e.position,
          questionId: e.questionId,
          text: q?.text ?? '',
          choices: q?.choices ?? [],
          selectedIndex: e.selectedIndex ?? undefined,
        }
      })

    return { exam, questions: view }
  },

  async submit(params: SubmitParams): Promise<ExamSchema> {
    const { projectId, studentId, examId, answers } = params

    const exam = await examRepo.findOneByOrFail({ id: examId, projectId, studentId })
    if (exam.status === 'SUBMITTED') {
      return exam
    }

    const eqs = await eqRepo.findBy({ examId: exam.id })
    const answerByQ = new Map(answers.map((a) => [a.questionId, a.selectedIndex]))

    // Fetch questions to get correct indices
    const questionIds = eqs.map((e) => e.questionId)
    const qb = databaseConnection.getRepository('question').createQueryBuilder('q').whereInIds(questionIds)
    const questions = await qb.getMany()
    const qById = new Map(questions.map((q: any) => [q.id, q]))

    let correct = 0

    for (const e of eqs) {
      const selected = answerByQ.get(e.questionId)
      if (selected === undefined) continue
      const q = qById.get(e.questionId)
      const isCorrect = selected === q.correctIndex
      if (isCorrect) correct += 1
      await eqRepo.update(e.id, { selectedIndex: selected, isCorrect, updated: new Date().toISOString() })
    }

    const updated: ExamSchema = {
      ...exam,
      status: 'SUBMITTED',
      finishedAt: new Date().toISOString(),
      scoreCorrect: correct,
      scoreTotal: eqs.length,
      updated: new Date().toISOString(),
    }
    await examRepo.update(exam.id, updated)

    return updated
  },

  async dashboard(params: DashboardParams): Promise<StudentDashboardView> {
    const { projectId, studentId, limitRecent } = params

    const exams = await examRepo.findBy({ projectId, studentId, status: 'SUBMITTED' as any })

    const perSubjectMap = new Map<string, { attempts: number; totalPct: number; best: number; last: string }>()
    const perDifficultyMap = new Map<string, { attempts: number; totalPct: number }>()

    for (const e of exams) {
      const pct = e.scoreTotal > 0 ? (e.scoreCorrect / e.scoreTotal) * 100 : 0
      // Subject agg
      const s = perSubjectMap.get(e.subjectId) ?? { attempts: 0, totalPct: 0, best: 0, last: '' }
      s.attempts += 1
      s.totalPct += pct
      s.best = Math.max(s.best, pct)
      s.last = e.finishedAt ?? s.last
      perSubjectMap.set(e.subjectId, s)
      // Difficulty agg
      const d = perDifficultyMap.get(e.difficulty) ?? { attempts: 0, totalPct: 0 }
      d.attempts += 1
      d.totalPct += pct
      perDifficultyMap.set(e.difficulty, d)
    }

    const perSubject = Array.from(perSubjectMap.entries()).map(([subjectId, v]) => ({
      subjectId,
      attempts: v.attempts,
      avgScore: v.attempts ? v.totalPct / v.attempts : 0,
      bestScore: v.best,
      lastAttemptAt: v.last ?? new Date(0).toISOString(),
    }))

    const perDifficulty = Array.from(perDifficultyMap.entries()).map(([difficulty, v]) => ({
      difficulty,
      attempts: v.attempts,
      avgScore: v.attempts ? v.totalPct / v.attempts : 0,
    }))

    const recentExams = exams
      .filter((e) => !!e.finishedAt)
      .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1))
      .slice(0, limitRecent ?? 10)
      .map((e) => ({
        examId: e.id,
        subjectId: e.subjectId,
        difficulty: e.difficulty,
        scoreCorrect: e.scoreCorrect,
        scoreTotal: e.scoreTotal,
        finishedAt: e.finishedAt!,
      }))

    return { perSubject, perDifficulty, recentExams }
  },
}

export type ExamQuestionView = {
  position: number
  questionId: string
  text: string
  choices: string[]
  selectedIndex?: number
}

export type GenerateParams = {
  projectId: string
  studentId: string
  subjectId: string
  difficulty: string
  numQuestions: number
}

export type GetExamParams = { projectId: string; studentId: string; examId: string }

export type SubmitParams = {
  projectId: string
  studentId: string
  examId: string
  answers: { questionId: string; selectedIndex: number }[]
}

export type DashboardParams = {
  projectId: string
  studentId: string
  limitRecent?: number
}

export type StudentDashboardView = {
  perSubject: Array<{ subjectId: string; attempts: number; avgScore: number; bestScore: number; lastAttemptAt: string }>
  perDifficulty: Array<{ difficulty: string; attempts: number; avgScore: number }>
  recentExams: Array<{ examId: string; subjectId: string; difficulty: string; scoreCorrect: number; scoreTotal: number; finishedAt: string }>
}
