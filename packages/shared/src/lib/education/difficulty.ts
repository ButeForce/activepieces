import { Static, Type } from '@sinclair/typebox'

export enum DifficultyLevel {
    EASY = 'EASY',
    MODERATE = 'MODERATE',
    DIFFICULT = 'DIFFICULT',
}

export const Difficulty = Type.Enum(DifficultyLevel)
export type Difficulty = Static<typeof Difficulty>
