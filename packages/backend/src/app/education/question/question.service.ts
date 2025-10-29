import { databaseConnection } from '../../database/database-connection'
import { QuestionEntity, QuestionSchema } from './question.entity'
import { apId } from '@activepieces/shared'

const repo = databaseConnection.getRepository(QuestionEntity)

export const questionService = {
  async create(params: CreateParams): Promise<QuestionSchema> {
    if (params.choices.length !== 4) {
      throw new Error('choices must have exactly 4 items')
    }
    if (params.correctIndex < 0 || params.correctIndex > 3) {
      throw new Error('correctIndex must be between 0 and 3')
    }
    const entity: QuestionSchema = {
      id: apId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      projectId: params.projectId,
      subjectId: params.subjectId,
      teacherId: params.teacherId,
      text: params.text,
      choices: params.choices,
      correctIndex: params.correctIndex,
      difficulty: params.difficulty,
    }
    await repo.insert(entity)
    return entity
  },

  async list(params: ListParams): Promise<QuestionSchema[]> {
    const where: Partial<QuestionSchema> = {
      projectId: params.projectId,
      subjectId: params.subjectId,
    }
    if (params.difficulty) {
      where.difficulty = params.difficulty
    }
    if (params.mineOnly) {
      where.teacherId = params.teacherId
    }
    return repo.findBy(where)
  },

  async update(params: UpdateParams): Promise<QuestionSchema> {
    const existing = await repo.findOneByOrFail({ id: params.id, projectId: params.projectId })
    if (existing.teacherId !== params.teacherId) {
      throw new Error('permission denied')
    }
    const updated: QuestionSchema = {
      ...existing,
      text: params.text ?? existing.text,
      choices: params.choices ?? existing.choices,
      correctIndex: params.correctIndex ?? existing.correctIndex,
      difficulty: params.difficulty ?? existing.difficulty,
      updated: new Date().toISOString(),
    }
    await repo.update(updated.id, updated)
    return updated
  },

  async delete(params: DeleteParams): Promise<void> {
    const existing = await repo.findOneByOrFail({ id: params.id, projectId: params.projectId })
    if (existing.teacherId !== params.teacherId) {
      throw new Error('permission denied')
    }
    await repo.delete(params.id)
  },

  async randomSample(params: RandomSampleParams): Promise<QuestionSchema[]> {
    const { projectId, subjectId, difficulty, limit } = params
    const primary = await repo.findBy({ projectId, subjectId, difficulty })
    let pool = primary
    if (pool.length < limit) {
      const topUp = await repo.findBy({ projectId, subjectId })
      pool = shuffle(uniqueById(topUp))
    } else {
      pool = shuffle(primary)
    }
    return pool.slice(0, limit)
  },
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function uniqueById(list: QuestionSchema[]): QuestionSchema[] {
  const seen = new Set<string>()
  const res: QuestionSchema[] = []
  for (const q of list) {
    if (!seen.has(q.id)) {
      seen.add(q.id)
      res.push(q)
    }
  }
  return res
}

export type CreateParams = {
  projectId: string
  subjectId: string
  teacherId: string
  text: string
  choices: string[]
  correctIndex: number
  difficulty: string
}

export type ListParams = {
  projectId: string
  subjectId: string
  difficulty?: string
  mineOnly?: boolean
  teacherId?: string
}

export type UpdateParams = {
  id: string
  projectId: string
  teacherId: string
  text?: string
  choices?: string[]
  correctIndex?: number
  difficulty?: string
}

export type DeleteParams = { id: string; projectId: string; teacherId: string }

export type RandomSampleParams = {
  projectId: string
  subjectId: string
  difficulty: string
  limit: number
}
