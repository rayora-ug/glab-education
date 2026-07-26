import type { ExamData } from '../../app/exam/ExamEngine'
import examA2Grammar from '../exam-a2-grammar.json'
import examB1Grammar from '../exam-b1-grammar.json'

// Add a new sitting of an existing question bank by spreading the source
// JSON with an overridden examCode/title — this keeps one canonical
// question bank per level instead of duplicating 100+ questions per sitting.
// Example for a repeat B1 sitting:
//   const examB1_0731: ExamData = { ...examB1Grammar, examCode: 'B1GRAM0731' } as ExamData

export const EXAM_REGISTRY: Record<string, ExamData> = {
  [examA2Grammar.examCode]: examA2Grammar as ExamData,
  [examB1Grammar.examCode]: examB1Grammar as ExamData,
}
