'use client'

import ExamEngine, { type ExamData } from './ExamEngine'
import examData from '../../data/exam-a2-vocab.json'

export default function ExamClient() {
  return <ExamEngine examData={examData as ExamData} permissionMode="static" />
}
