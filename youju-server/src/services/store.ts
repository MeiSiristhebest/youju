import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../../data')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (e) {
    console.error(`Failed to read ${filePath}:`, e)
  }
  return defaultValue
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir()
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error(`Failed to write ${filePath}:`, e)
  }
}

// 任务存储
interface StoredTask {
  id: string
  title: string
  scenarioType: string
  sourceIds: string[]
  result: unknown
  createdAt: string
}

let taskCounter = 0

export function loadTasks(): Map<string, StoredTask> {
  const tasks = readJsonFile<StoredTask[]>(TASKS_FILE, [])
  const map = new Map<string, StoredTask>()
  for (const t of tasks) {
    map.set(t.id, t)
    const idNum = parseInt(t.id)
    if (idNum > taskCounter) taskCounter = idNum
  }
  return map
}

export function saveTasks(tasks: Map<string, StoredTask>): void {
  const list = Array.from(tasks.values())
  writeJsonFile(TASKS_FILE, list)
}

export function getNextTaskId(): string {
  return String(++taskCounter)
}

// 材料存储
interface StoredSource {
  id: string
  type: string
  name: string
  content: string
  meta?: string
}

let sourceCounter = 0

export function loadSources(): Map<string, StoredSource> {
  const sources = readJsonFile<StoredSource[]>(SOURCES_FILE, [])
  const map = new Map<string, StoredSource>()
  for (const s of sources) {
    map.set(s.id, s)
    const idNum = parseInt(s.id)
    if (idNum > sourceCounter) sourceCounter = idNum
  }
  return map
}

export function saveSources(sources: Map<string, StoredSource>): void {
  const list = Array.from(sources.values())
  writeJsonFile(SOURCES_FILE, list)
}

export function getNextSourceId(): string {
  return String(++sourceCounter)
}
