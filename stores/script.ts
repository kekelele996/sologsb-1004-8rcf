import { defineStore } from 'pinia'
import type { Exhibit, Hall, Language, LanguageDraft, PersistedState, ScriptStatus, Segment, SegmentReviewStatus, VersionSnapshot } from '~/types'

export const LANGUAGES: Language[] = [
  { id: 'zh', code: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { id: 'en', code: 'en-US', label: 'English', shortLabel: 'EN' },
  { id: 'ja', code: 'ja-JP', label: '日本語', shortLabel: '日' }
]

const STORAGE_KEY = 'museum-script-studio-v1'

type SegmentSeed = [string, string] | [string, string, SegmentReviewStatus]

const segments = (prefix: string, values: SegmentSeed[]): Segment[] => values.map(([label, content, reviewStatus], index) => ({
  id: `${prefix}-${index + 1}`,
  label,
  content,
  reviewStatus: reviewStatus || 'pending',
  reviewLog: []
}))

function demoState(): PersistedState {
  const halls: Hall[] = [
    { id: 'hall-ancient', name: '文明肇始厅', description: '史前至先秦文明，共 18 个展项' },
    { id: 'hall-silk', name: '丝路交融厅', description: '丝绸之路上的器物、信仰与生活' },
    { id: 'hall-city', name: '城市记忆厅', description: '近现代城市空间与市民生活' }
  ]
  const exhibits: Exhibit[] = [
    {
      id: 'exhibit-jade', hallId: 'hall-ancient', code: 'A-03', title: '玉琮：沟通天地的礼器', order: 3,
      drafts: [
        {
          id: 'draft-jade-zh', languageId: 'zh', title: '玉琮：沟通天地的礼器',
          narration: '这件玉琮出土于长江下游的良渚遗址。它外方内圆，四角雕刻神人兽面纹，体现了新石器时代晚期精湛的玉器工艺。',
          accessibility: '玉琮为深青色，高约二十厘米。触摸模型可感受方形四角与中央圆孔；圆孔贯穿器身。',
          durationMinutes: 2.5, sources: '《中国玉器全集》第一卷；本馆藏品档案 1987-J-042',
          status: 'approved', updatedAt: '2026-09-23T08:35:00.000Z',
          segments: segments('jade-zh', [
            ['开场定位', '这件玉琮来自距今约五千年的良渚文化。', 'confirmed'],
            ['器物观察', '它外方内圆，四角雕刻神人兽面纹。', 'confirmed'],
            ['文化含义', '玉琮常被看作沟通天地的礼器，也象征权力与身份。', 'confirmed'],
            ['参观提示', '请沿展柜顺时针观察，触摸复制品前先使用免洗消毒液。', 'confirmed']
          ])
        },
        {
          id: 'draft-jade-en', languageId: 'en', title: 'Jade Cong: A Ritual Object Between Heaven and Earth',
          narration: 'This jade cong was made by the Liangzhu culture. Its square exterior and circular bore embody an early Chinese vision of the cosmos.',
          accessibility: 'The object is dark green. A tactile model shows four corners, carved faces, and a central circular opening.',
          durationMinutes: 2.3, sources: 'Complete Collection of Chinese Jades, Vol. 1; Museum accession 1987-J-042',
          status: 'review', updatedAt: '2026-09-24T02:15:00.000Z',
          segments: segments('jade-en', [
            ['Introduction', 'This jade cong is about five thousand years old.', 'confirmed'],
            ['Visual description', 'Its square body encloses a circular opening, while spirit-and-animal motifs cover the corners.'],
            ['Meaning', 'Jade cong is understood as a ritual link between heaven and earth.']
          ])
        },
        {
          id: 'draft-jade-ja', languageId: 'ja', title: '玉琮：天と地を結ぶ礼器',
          narration: 'こちらは良渚文化の玉琮です。外側は方形、中央は円形で、四隅には神人獣面文が刻まれています。',
          accessibility: '暗い青緑色の玉製です。複製模型では四つの角と中央の円孔を触って確認できます。',
          durationMinutes: 2.6, sources: '『中国玉器全集』第一巻；収蔵資料 1987-J-042',
          status: 'draft', updatedAt: '2026-09-21T06:10:00.000Z',
          segments: segments('jade-ja', [
            ['導入', '約五千年前の良渚文化を代表する玉琮です。'],
            ['観察', '外側は方形、中央は円形で、四隅に精緻な文様があります。'],
            ['意味', '天地を結ぶ礼器として、力と身分を象徴しました。']
          ])
        }
      ]
    },
    {
      id: 'exhibit-bronze', hallId: 'hall-ancient', code: 'A-08', title: '青铜爵与礼制', order: 8,
      drafts: [
        {
          id: 'draft-bronze-zh', languageId: 'zh', title: '青铜爵与礼制',
          narration: '爵是最早的青铜酒器之一。三足稳定器身，长流便于倾倒，柱饰则与商周礼仪密切相关。',
          accessibility: '器物为青铜色，器口一侧有长流，底部三足支撑。复制件配有可触摸的局部纹样。',
          durationMinutes: 3, sources: '《殷周青铜器通论》；展品说明卡 A-08',
          status: 'returned', updatedAt: '2026-09-23T11:20:00.000Z',
          segments: (() => {
            const list = segments('bronze-zh', [
              ['器物介绍', '这是一件商代青铜爵，用于温酒和饮酒。', 'confirmed'],
              ['结构说明', '三足使器身稳定，前端的流便于倾倒。'],
              ['礼制背景', '青铜器数量与形制反映了使用者的身份。', 'returned']
            ])
            list[2].reviewLog.unshift({
              id: 'review-bronze-zh-1',
              type: 'return',
              note: '请补充“柱饰”的用途说明，并核对青铜爵的年代断代。',
              createdAt: '2026-09-23T11:20:00.000Z'
            })
            return list
          })()
        },
        {
          id: 'draft-bronze-en', languageId: 'en', title: 'Bronze Jue and Ritual Order',
          narration: 'The jue was among the earliest bronze drinking vessels. Its tripod base, pouring spout, and posts were closely tied to Shang and Zhou ritual.',
          accessibility: 'The tactile replica includes the long spout, tripod feet, and raised posts.',
          durationMinutes: 2.8, sources: 'A General Survey of Yin-Zhou Bronzes; Gallery label A-08',
          status: 'draft', updatedAt: '2026-09-22T09:00:00.000Z',
          segments: segments('bronze-en', [['Object', 'This bronze jue dates to the Shang dynasty.'], ['Structure', 'Three legs support the body; the long spout guides the pour.']])
        }
      ]
    },
    {
      id: 'exhibit-silk', hallId: 'hall-silk', code: 'B-02', title: '织机与丝路纹样', order: 2,
      drafts: [{
        id: 'draft-silk-zh', languageId: 'zh', title: '织机与丝路纹样',
        narration: '织机把一根根丝线组织成布匹，也把不同地区的图案与故事连接在一起。',
        accessibility: '体验区提供放大纹样、凸点经纬结构以及可操作的小型织机模型。',
        durationMinutes: 4, sources: '馆内教育活动资料；丝绸之路纺织史专题',
        status: 'draft', updatedAt: '2026-09-20T03:00:00.000Z',
        segments: segments('silk-zh', [['序言', '丝绸不只是一种材料，也是交流的媒介。'], ['互动', '请试着推动梭子，观察经纬线如何交会。']])
      }]
    }
  ]
  return {
    halls,
    exhibits,
    versions: [],
    selectedHallId: halls[0].id,
    selectedExhibitId: exhibits[0].id,
    selectedLanguageId: 'zh',
    lastSavedAt: new Date().toISOString()
  }
}

// 旧版本地数据里段落只有 locked 标记，这里统一迁移为审校状态与意见记录。
function normalizeDraft(draft: LanguageDraft) {
  draft.segments = (draft.segments || []).map((segment) => {
    const legacy = segment as Segment & { locked?: boolean }
    return {
      id: legacy.id,
      label: legacy.label,
      content: legacy.content,
      reviewStatus: legacy.reviewStatus || (legacy.locked ? 'confirmed' : 'pending'),
      reviewLog: Array.isArray(legacy.reviewLog) ? legacy.reviewLog : []
    }
  })
}

function normalizeState(data: PersistedState): PersistedState {
  for (const exhibit of data.exhibits || []) {
    for (const draft of exhibit.drafts || []) normalizeDraft(draft)
  }
  for (const version of data.versions || []) normalizeDraft(version.draft)
  return data
}

export const useScriptStore = defineStore('museum-script', {
  state: () => ({
    halls: [] as Hall[],
    exhibits: [] as Exhibit[],
    versions: [] as VersionSnapshot[],
    selectedHallId: '',
    selectedExhibitId: '',
    selectedLanguageId: 'zh',
    lastSavedAt: '',
    hydrated: false,
    past: [] as string[],
    future: [] as string[],
    notice: ''
  }),
  getters: {
    selectedHall(state): Hall | undefined {
      return state.halls.find(hall => hall.id === state.selectedHallId)
    },
    hallExhibits(state): Exhibit[] {
      return state.exhibits.filter(exhibit => exhibit.hallId === state.selectedHallId).sort((a, b) => a.order - b.order)
    },
    selectedExhibit(state): Exhibit | undefined {
      return state.exhibits.find(exhibit => exhibit.id === state.selectedExhibitId)
    },
    selectedDraft(): LanguageDraft | undefined {
      return this.selectedExhibit?.drafts.find(draft => draft.languageId === this.selectedLanguageId)
    },
    wordCount(): number {
      return (this.selectedDraft?.narration || '').replace(/\s/g, '').length
    },
    canUndo(state): boolean { return state.past.length > 0 },
    canRedo(state): boolean { return state.future.length > 0 },
    confirmedCount(): number {
      return (this.selectedDraft?.segments || []).filter(segment => segment.reviewStatus === 'confirmed').length
    },
    returnedCount(): number {
      return (this.selectedDraft?.segments || []).filter(segment => segment.reviewStatus === 'returned').length
    },
    todoSegments(): Segment[] {
      return (this.selectedDraft?.segments || []).filter(segment => segment.reviewStatus !== 'confirmed')
    },
    allSegmentsConfirmed(): boolean {
      const list = this.selectedDraft?.segments || []
      return list.length > 0 && list.every(segment => segment.reviewStatus === 'confirmed')
    }
  },
  actions: {
    hydrate() {
      if (this.hydrated || typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = normalizeState(JSON.parse(saved) as PersistedState)
          this.$patch({ ...data, hydrated: true })
          if (!this.halls.length || !this.exhibits.length) this.resetDemo()
        } catch {
          this.resetDemo()
        }
      } else {
        this.resetDemo()
      }
      this.ensureSelection()
      this.hydrated = true
    },
    resetDemo() {
      this.$patch({ ...demoState(), hydrated: true, past: [], future: [] })
      this.persist()
      this.notice = '示例数据已就绪，可直接开始编辑。'
    },
    snapshot(): string {
      return JSON.stringify({ halls: this.halls, exhibits: this.exhibits, versions: this.versions })
    },
    commit(mutator: () => void) {
      this.past.push(this.snapshot())
      if (this.past.length > 50) this.past.shift()
      this.future = []
      mutator()
      this.lastSavedAt = new Date().toISOString()
      this.persist()
    },
    persist() {
      if (typeof localStorage === 'undefined') return
      const data: PersistedState = {
        halls: this.halls, exhibits: this.exhibits, versions: this.versions,
        selectedHallId: this.selectedHallId, selectedExhibitId: this.selectedExhibitId,
        selectedLanguageId: this.selectedLanguageId, lastSavedAt: this.lastSavedAt
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    ensureSelection() {
      if (!this.halls.some(hall => hall.id === this.selectedHallId)) this.selectedHallId = this.halls[0]?.id || ''
      const inHall = this.exhibits.filter(exhibit => exhibit.hallId === this.selectedHallId)
      if (!inHall.some(exhibit => exhibit.id === this.selectedExhibitId)) this.selectedExhibitId = inHall[0]?.id || ''
      const exhibit = this.selectedExhibit
      if (!exhibit?.drafts.some(draft => draft.languageId === this.selectedLanguageId)) this.selectedLanguageId = exhibit?.drafts[0]?.languageId || 'zh'
    },
    selectHall(id: string) {
      this.selectedHallId = id
      const exhibit = this.exhibits.find(item => item.hallId === id)
      this.selectedExhibitId = exhibit?.id || ''
      this.ensureSelection()
      this.persist()
    },
    selectExhibit(id: string) {
      this.selectedExhibitId = id
      this.ensureSelection()
      this.persist()
    },
    selectLanguage(id: string) {
      this.selectedLanguageId = id
      this.persist()
    },
    updateDraft(patch: Partial<Pick<LanguageDraft, 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources'>>) {
      const draft = this.selectedDraft
      if (!draft || draft.status === 'approved') return
      this.commit(() => Object.assign(draft, patch, { updatedAt: new Date().toISOString() }))
      this.notice = '改动已自动保存到浏览器。'
    },
    updateSegment(id: string, patch: Partial<Pick<Segment, 'label' | 'content'>>) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || draft.status === 'approved' || segment.reviewStatus === 'confirmed') return
      this.commit(() => Object.assign(segment, patch))
    },
    addSegment() {
      const draft = this.selectedDraft
      if (!draft || draft.status === 'approved') return
      this.commit(() => draft.segments.push({ id: `segment-${Date.now()}`, label: `新段落 ${draft.segments.length + 1}`, content: '', reviewStatus: 'pending', reviewLog: [] }))
    },
    removeSegment(id: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || draft.status === 'approved' || segment.reviewStatus === 'confirmed') return
      this.commit(() => { draft.segments = draft.segments.filter(item => item.id !== id) })
    },
    confirmSegment(id: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || draft.status !== 'review' || segment.reviewStatus === 'confirmed') return
      this.commit(() => {
        segment.reviewStatus = 'confirmed'
        draft.updatedAt = new Date().toISOString()
      })
      this.notice = `「${segment.label}」已确认并锁定。`
    },
    returnSegment(id: string, note: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      const reason = note.trim()
      if (!draft || !segment || draft.status !== 'review' || !reason) return
      this.commit(() => {
        segment.reviewStatus = 'returned'
        segment.reviewLog.unshift({ id: `review-${Date.now()}`, type: 'return', note: reason, createdAt: new Date().toISOString() })
        draft.status = 'returned'
        draft.updatedAt = new Date().toISOString()
      })
      this.notice = `已退回「${segment.label}」，已确认段落保持锁定。`
    },
    resubmitSegment(id: string, note?: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || segment.reviewStatus !== 'returned') return
      const reply = (note || '').trim()
      this.commit(() => {
        segment.reviewStatus = 'pending'
        if (reply) segment.reviewLog.unshift({ id: `review-${Date.now()}`, type: 'resubmit', note: reply, createdAt: new Date().toISOString() })
        draft.updatedAt = new Date().toISOString()
      })
      this.notice = `「${segment.label}」已重新提交，退回标记已清除，意见保留在记录中。`
    },
    submitForReview() {
      const draft = this.selectedDraft
      if (!draft || draft.status === 'approved') return
      this.commit(() => { draft.status = 'review'; draft.updatedAt = new Date().toISOString() })
      this.notice = '已提交送审，等待专家逐段确认。'
    },
    approveDraft() {
      const draft = this.selectedDraft
      if (!draft || draft.status !== 'review' || !this.allSegmentsConfirmed) return
      this.commit(() => { draft.status = 'approved'; draft.updatedAt = new Date().toISOString() })
      this.notice = '所有段落已确认，稿件已定稿并锁定。'
    },
    reopenDraft() {
      const draft = this.selectedDraft
      if (!draft || draft.status !== 'approved') return
      this.commit(() => { draft.status = 'draft'; draft.updatedAt = new Date().toISOString() })
      this.notice = '已开启修订：段落保持锁定，提交送审后由专家退回需要修改的段落。'
    },
    statusLabel(status: ScriptStatus) {
      return ({ draft: '草稿', review: '待审', returned: '退回', approved: '已定稿' })[status]
    },
    segmentStatusLabel(status: SegmentReviewStatus) {
      return ({ pending: '待确认', confirmed: '已确认', returned: '已退回' })[status]
    },
    createVersion(name?: string) {
      const draft = this.selectedDraft
      if (!draft) return
      const version: VersionSnapshot = {
        id: `version-${Date.now()}`,
        exhibitId: this.selectedExhibitId,
        languageId: this.selectedLanguageId,
        name: name || `${new Date().toLocaleString('zh-CN', { hour12: false })} 快照`,
        createdAt: new Date().toISOString(),
        draft: JSON.parse(JSON.stringify(draft))
      }
      this.commit(() => this.versions.unshift(version))
      this.notice = '已保存当前版本，可在版本页比较或恢复。'
    },
    restoreVersion(id: string) {
      const version = this.versions.find(item => item.id === id)
      if (!version) return
      const exhibit = this.exhibits.find(item => item.id === version.exhibitId)
      const current = exhibit?.drafts.find(item => item.languageId === version.languageId)
      if (current?.status === 'approved') {
        this.notice = '已定稿语言不能直接覆盖，请先“开启修订”再恢复版本。'
        return
      }
      this.commit(() => {
        if (!exhibit) return
        const index = exhibit.drafts.findIndex(item => item.languageId === version.languageId)
        const restored = JSON.parse(JSON.stringify(version.draft)) as LanguageDraft
        restored.status = 'review'
        restored.updatedAt = new Date().toISOString()
        if (index >= 0) exhibit.drafts[index] = restored
        else exhibit.drafts.push(restored)
      })
      this.selectedExhibitId = version.exhibitId
      this.selectedLanguageId = version.languageId
      this.notice = '版本已恢复：段落锁定与审校意见一并还原，稿件重新进入待审。'
    },
    undo() {
      const state = this.past.pop()
      if (!state) return
      this.future.push(this.snapshot())
      this.$patch(JSON.parse(state))
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已撤销上一步。'
    },
    redo() {
      const state = this.future.pop()
      if (!state) return
      this.past.push(this.snapshot())
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已重做。'
    },
    completionFor(exhibit: Exhibit, languageId: string): number {
      const draft = exhibit.drafts.find(item => item.languageId === languageId)
      if (!draft) return 0
      const checks = [draft.title, draft.narration, draft.accessibility, draft.sources, draft.segments.length > 0 ? 'segments' : '']
      return Math.round(checks.filter(Boolean).length / checks.length * 100)
    }
  }
})
