'use client'

import ExamEngine, { type ExamData } from '../exam/ExamEngine'
import examData from '../../data/exam-a2-grammar.json'

export default function ExamGrammarClient() {
  return <ExamEngine examData={examData as ExamData} permissionMode="live" />
}
