'use client'

import ExamEngine, { type ExamData } from '../exam/ExamEngine'
import examData from '../../data/exam-b1-grammar.json'

export default function ExamB1Client() {
  return <ExamEngine examData={examData as ExamData} permissionMode="live" />
}
