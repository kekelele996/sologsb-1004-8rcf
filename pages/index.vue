<script setup lang="ts">
import type { DeviceKind, DiffLine, LanguageDraft, ReviewEntry, ScriptStatus, Segment, SegmentReviewStatus } from '~/types'
import { LANGUAGES, useScriptStore } from '~/stores/script'

const store = useScriptStore()
const activeTab = ref('editor')
const device = ref<DeviceKind>('desktop')
const versionDialog = ref(false)
const versionName = ref('')
const leftFilter = ref('')
const compareA = ref('')
const compareB = ref('')
const helpDialog = ref(false)
const deleteTarget = ref<string | null>(null)
const returnTarget = ref<string | null>(null)
const returnReason = ref('')
const resubmitTarget = ref<string | null>(null)
const resubmitNote = ref('')
const flashSegmentId = ref('')
let flashTimer: ReturnType<typeof setTimeout> | undefined

const statusOptions: Array<{ value: ScriptStatus; label: string; color: string }> = [
  { value: 'draft', label: '草稿', color: 'grey' },
  { value: 'review', label: '待审', color: 'warning' },
  { value: 'returned', label: '退回', color: 'error' },
  { value: 'approved', label: '已定稿', color: 'success' }
]
const deviceOptions: Array<{ value: DeviceKind; label: string }> = [
  { value: 'desktop', label: '桌面大屏' },
  { value: 'tablet', label: '平板导览' },
  { value: 'mobile', label: '手机导览' },
  { value: 'kiosk', label: '馆内触摸屏' }
]

const draft = computed(() => store.selectedDraft)
const exhibit = computed(() => store.selectedExhibit)
const currentLanguage = computed(() => LANGUAGES.find(item => item.id === store.selectedLanguageId))
const currentStatus = computed(() => statusOptions.find(item => item.value === draft.value?.status) || statusOptions[0])
const isApproved = computed(() => draft.value?.status === 'approved')
const canReview = computed(() => draft.value?.status === 'review')
const filteredExhibits = computed(() => store.hallExhibits.filter(item => !leftFilter.value || `${item.code} ${item.title}`.toLowerCase().includes(leftFilter.value.toLowerCase())))
const versions = computed(() => store.versions.filter(item => item.exhibitId === store.selectedExhibitId && item.languageId === store.selectedLanguageId))
const selectedVersionA = computed(() => versions.value.find(item => item.id === compareA.value))
const selectedVersionB = computed(() => versions.value.find(item => item.id === compareB.value))
const diffLines = computed<DiffLine[]>(() => {
  const before = selectedVersionA.value?.draft.narration || ''
  const after = selectedVersionB.value?.draft.narration || ''
  return buildDiff(before, after)
})

onMounted(() => {
  store.hydrate()
  syncCompareSelection()
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearTimeout(flashTimer)
})
watch(versions, syncCompareSelection)

function syncCompareSelection() {
  if (!versions.value.some(item => item.id === compareA.value)) compareA.value = versions.value[1]?.id || versions.value[0]?.id || ''
  if (!versions.value.some(item => item.id === compareB.value)) compareB.value = versions.value[0]?.id || ''
}
function handleKeydown(event: KeyboardEvent) {
  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) return
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? store.redo() : store.undo()
  }
  if (event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    store.createVersion('键盘快捷保存')
  }
}
function saveDraftField(field: 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources', event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  store.updateDraft({ [field]: field === 'durationMinutes' ? Number(value) : value } as Partial<LanguageDraft>)
}
function saveSegment(id: string, field: 'label' | 'content', event: Event) {
  store.updateSegment(id, { [field]: (event.target as HTMLInputElement | HTMLTextAreaElement).value })
}
function submitVersion() {
  store.createVersion(versionName.value.trim() || undefined)
  versionName.value = ''
  versionDialog.value = false
}
function confirmDelete() {
  if (deleteTarget.value) store.removeSegment(deleteTarget.value)
  deleteTarget.value = null
}
function openReturn(id: string) {
  returnTarget.value = id
  returnReason.value = ''
}
function submitReturn() {
  if (!returnTarget.value || !returnReason.value.trim()) return
  store.returnSegment(returnTarget.value, returnReason.value)
  returnTarget.value = null
}
function openResubmit(id: string) {
  resubmitTarget.value = id
  resubmitNote.value = ''
}
function submitResubmit() {
  if (!resubmitTarget.value) return
  store.resubmitSegment(resubmitTarget.value, resubmitNote.value)
  resubmitTarget.value = null
}
function jumpToSegment(id: string) {
  activeTab.value = 'editor'
  nextTick(() => {
    const el = document.getElementById(`segment-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    flashSegmentId.value = id
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flashSegmentId.value = '' }, 2400)
    const field = el.querySelector<HTMLElement>('textarea:not([readonly]), input:not([readonly])')
    field?.focus({ preventScroll: true })
  })
}
function segmentStatusMeta(status: SegmentReviewStatus): { label: string; color: string; icon: string } {
  return {
    pending: { label: '待确认', color: 'warning', icon: 'mdi-progress-clock' },
    confirmed: { label: '已确认', color: 'success', icon: 'mdi-check-decagram-outline' },
    returned: { label: '已退回', color: 'error', icon: 'mdi-alert-circle-outline' }
  }[status]
}
function latestReturn(segment: Segment): ReviewEntry | undefined {
  return segment.reviewLog.find(entry => entry.type === 'return')
}
function buildDiff(before: string, after: string): DiffLine[] {
  const a = before.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const b = after.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1])
  }
  const result: DiffLine[] = []
  let i = 0, j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { result.push({ type: 'same', text: a[i] }); i++; j++ }
    else if (rows[i + 1][j] >= rows[i][j + 1]) { result.push({ type: 'remove', text: a[i] }); i++ }
    else { result.push({ type: 'add', text: b[j] }); j++ }
  }
  while (i < a.length) result.push({ type: 'remove', text: a[i++] })
  while (j < b.length) result.push({ type: 'add', text: b[j++] })
  return result
}
function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
function segmentLabel(segment: Segment) { return segment.label || '未命名段落' }
</script>

<template>
  <v-app class="workspace-shell">
    <a class="skip-link" href="#main-workspace">跳到主要内容</a>
    <v-app-bar color="surface" flat border>
      <template #prepend><v-app-bar-nav-icon aria-label="打开项目导航" /></template>
      <v-app-bar-title>
        <span class="project-mark">博物声</span>
        <span class="text-caption text-medium-emphasis ms-3 d-none d-md-inline">展陈脚本工作台</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip class="me-2 d-none d-sm-flex" :color="currentStatus.color" variant="tonal" size="small">
        <span class="status-dot" :style="{ background: 'currentColor' }" />{{ currentStatus.label }}
      </v-chip>
      <v-btn variant="text" prepend-icon="mdi-keyboard-outline" class="d-none d-md-flex" @click="helpDialog = true">快捷键</v-btn>
      <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="versionDialog = true">保存版本</v-btn>
    </v-app-bar>

    <v-navigation-drawer permanent width="320" color="surface" border>
      <div class="pa-4">
        <div class="section-title mb-2">展厅</div>
        <v-select
          :model-value="store.selectedHallId"
          :items="store.halls"
          item-title="name"
          item-value="id"
          hide-details
          aria-label="选择展厅"
          @update:model-value="store.selectHall"
        />
        <div class="d-flex align-center justify-space-between mt-5 mb-2">
          <div class="section-title">展项</div>
          <v-chip size="x-small" variant="tonal">{{ filteredExhibits.length }} 项</v-chip>
        </div>
        <v-text-field v-model="leftFilter" density="compact" hide-details prepend-inner-icon="mdi-magnify" placeholder="筛选展项" aria-label="筛选展项" />
        <v-list class="mt-2 bg-transparent" nav>
          <v-list-item
            v-for="item in filteredExhibits"
            :key="item.id"
            :active="item.id === store.selectedExhibitId"
            color="primary"
            rounded="lg"
            @click="store.selectExhibit(item.id)"
          >
            <template #prepend><v-chip size="small" variant="outlined">{{ item.code }}</v-chip></template>
            <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.drafts.length }} 种语言</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
      <v-divider />
      <div class="pa-4">
        <div class="section-title mb-3">多语言完成度</div>
        <div v-for="lang in LANGUAGES" :key="lang.id" class="mb-3">
          <button class="d-flex align-center w-100 border-0 bg-transparent text-left pa-0" :aria-pressed="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">
            <v-avatar size="32" :color="lang.id === store.selectedLanguageId ? 'primary' : 'grey-lighten-2'" :class="lang.id === store.selectedLanguageId ? 'text-white' : ''">{{ lang.shortLabel }}</v-avatar>
            <div class="ms-3 flex-grow-1">
              <div class="text-body-2 font-weight-medium">{{ lang.label }}</div>
              <v-progress-linear class="mt-1" :model-value="exhibit ? store.completionFor(exhibit, lang.id) : 0" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'" height="5" rounded />
            </div>
            <span class="text-caption ms-3">{{ exhibit ? store.completionFor(exhibit, lang.id) : 0 }}%</span>
          </button>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main id="main-workspace" style="background:#f4f0e8">
      <div class="pa-3 pa-md-6">
        <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
          <div>
            <div class="text-caption text-medium-emphasis mb-1">{{ store.selectedHall?.name }} / {{ exhibit?.code }}</div>
            <h1 class="text-h4 font-weight-bold project-mark">{{ exhibit?.title || '请选择展项' }}</h1>
            <div class="text-body-2 text-medium-emphasis mt-2">
              当前语言：{{ currentLanguage?.label }} ·
              {{ draft?.updatedAt ? `最后更新 ${formatTime(draft.updatedAt)}` : '尚未建立文稿' }}
            </div>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" prepend-icon="mdi-undo" :disabled="!store.canUndo" @click="store.undo">撤销</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-redo" :disabled="!store.canRedo" @click="store.redo">重做</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-history" @click="activeTab = 'versions'">版本</v-btn>
          </div>
        </div>

        <v-alert v-if="store.notice" class="mb-4" color="secondary" variant="tonal" closable @click:close="store.notice = ''">{{ store.notice }}</v-alert>

        <template v-if="draft">
          <v-alert v-if="draft.status === 'returned'" class="mb-4" type="error" variant="tonal" icon="mdi-alert-circle-outline">
            专家退回了 {{ store.returnedCount }} 个段落，已确认段落保持锁定。请在“待处理段落”中逐条处理并重新提交。
          </v-alert>
          <v-alert v-else-if="draft.status === 'review'" class="mb-4" type="warning" variant="tonal" icon="mdi-progress-clock">
            待审中：专家可逐段确认或退回；全部 {{ draft.segments.length }} 段确认后才能定稿（当前 {{ store.confirmedCount }} 段已确认）。
          </v-alert>
          <v-alert v-else-if="isApproved" class="mb-4" type="success" variant="tonal" icon="mdi-lock-outline">
            已定稿：内容只读，恢复旧版本也不会直接覆盖。如需修改，请先“开启修订”。
          </v-alert>
        </template>

        <v-tabs v-model="activeTab" color="primary" bg-color="surface" rounded="lg" class="mb-4 px-2">
          <v-tab value="editor">脚本编辑</v-tab>
          <v-tab value="versions">版本比较</v-tab>
          <v-tab value="preview">设备预览</v-tab>
          <v-tab value="sources">资料核对</v-tab>
        </v-tabs>

        <div v-if="draft">
          <v-window v-model="activeTab" :touch="false">
            <v-window-item value="editor">
              <v-row>
                <v-col cols="12" lg="8">
                  <v-card class="script-card pa-4 pa-md-6">
                    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                      <div>
                        <div class="section-title">当前文稿</div>
                        <div class="text-h6 font-weight-bold mt-1">{{ currentLanguage?.label }}</div>
                      </div>
                      <div class="d-flex flex-wrap align-center ga-2">
                        <v-chip :color="currentStatus.color" variant="tonal">{{ currentStatus.label }}</v-chip>
                        <v-btn
                          v-if="draft.status === 'draft' || draft.status === 'returned'"
                          color="primary"
                          variant="tonal"
                          prepend-icon="mdi-send-outline"
                          @click="store.submitForReview"
                        >提交送审</v-btn>
                        <v-btn
                          v-if="canReview"
                          color="success"
                          prepend-icon="mdi-check-all"
                          :disabled="!store.allSegmentsConfirmed"
                          :title="store.allSegmentsConfirmed ? '所有段落已确认，可以定稿' : '还有段落未确认，不能定稿'"
                          @click="store.approveDraft"
                        >定稿</v-btn>
                        <v-btn
                          v-if="isApproved"
                          variant="outlined"
                          prepend-icon="mdi-pencil-outline"
                          @click="store.reopenDraft"
                        >开启修订</v-btn>
                        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" :disabled="isApproved" @click="store.addSegment">新增段落</v-btn>
                      </div>
                    </div>

                    <v-text-field label="展项标题" :model-value="draft.title" hint="面向观众的主标题" persistent-hint :readonly="isApproved" @change="saveDraftField('title', $event)" />
                    <v-row class="mt-2">
                      <v-col cols="12" md="5">
                        <v-text-field label="预计朗读时长（分钟）" type="number" min="0" step="0.5" :model-value="draft.durationMinutes" :readonly="isApproved" @change="saveDraftField('durationMinutes', $event)" />
                      </v-col>
                      <v-col cols="12" md="7">
                        <v-text-field label="资料来源" :model-value="draft.sources" hint="书籍、档案号或专家核验记录" persistent-hint :readonly="isApproved" @change="saveDraftField('sources', $event)" />
                      </v-col>
                    </v-row>

                    <div class="section-title mt-6 mb-2">完整讲解词</div>
                    <v-textarea label="讲解词" rows="7" auto-grow counter :model-value="draft.narration" :readonly="isApproved" @change="saveDraftField('narration', $event)" />

                    <div class="section-title mt-6 mb-2">无障碍描述</div>
                    <v-textarea label="无障碍描述" rows="4" auto-grow hint="描述尺寸、材质、色彩与可触摸特征，避免只依赖视觉" persistent-hint :model-value="draft.accessibility" :readonly="isApproved" @change="saveDraftField('accessibility', $event)" />
                  </v-card>

                  <v-card class="script-card pa-4 pa-md-6 mt-5">
                    <div class="d-flex align-center justify-space-between mb-4">
                      <div>
                        <div class="section-title">分段审校</div>
                        <div class="text-body-2 text-medium-emphasis mt-1">专家逐段确认或退回；已确认段落锁定，退回意见随段落保留。</div>
                      </div>
                      <v-chip variant="tonal" :color="store.allSegmentsConfirmed ? 'success' : undefined">{{ store.confirmedCount }}/{{ draft.segments.length }} 已确认</v-chip>
                    </div>
                    <div class="d-flex flex-column ga-3">
                      <div
                        v-for="(segment, index) in draft.segments"
                        :key="segment.id"
                        :id="`segment-${segment.id}`"
                        class="segment-row"
                        :class="[`is-${segment.reviewStatus}`, { flash: flashSegmentId === segment.id }]"
                      >
                        <div class="d-flex align-center flex-wrap ga-2">
                          <v-chip size="small" :color="segmentStatusMeta(segment.reviewStatus).color" variant="tonal" :prepend-icon="segmentStatusMeta(segment.reviewStatus).icon">
                            {{ segmentStatusMeta(segment.reviewStatus).label }}
                          </v-chip>
                          <v-text-field
                            class="flex-grow-1"
                            :model-value="segment.label"
                            density="compact"
                            hide-details
                            variant="plain"
                            :readonly="segment.reviewStatus === 'confirmed' || isApproved"
                            :aria-label="`第 ${index + 1} 段标题`"
                            @change="saveSegment(segment.id, 'label', $event)"
                          />
                          <v-btn
                            v-if="canReview && segment.reviewStatus !== 'confirmed'"
                            size="small"
                            color="success"
                            variant="tonal"
                            :aria-label="`确认第 ${index + 1} 段`"
                            @click="store.confirmSegment(segment.id)"
                          >确认</v-btn>
                          <v-btn
                            v-if="canReview"
                            size="small"
                            color="error"
                            variant="text"
                            :aria-label="`退回第 ${index + 1} 段`"
                            @click="openReturn(segment.id)"
                          >退回</v-btn>
                          <v-btn
                            v-if="segment.reviewStatus === 'returned'"
                            size="small"
                            color="primary"
                            variant="tonal"
                            :aria-label="`重新提交第 ${index + 1} 段`"
                            @click="openResubmit(segment.id)"
                          >重新提交</v-btn>
                          <v-btn
                            icon="mdi-delete-outline"
                            size="small"
                            variant="text"
                            color="error"
                            :disabled="segment.reviewStatus === 'confirmed' || isApproved"
                            :aria-label="`删除第 ${index + 1} 段`"
                            @click="deleteTarget = segment.id"
                          />
                        </div>
                        <v-textarea
                          class="mt-2"
                          :model-value="segment.content"
                          rows="2"
                          auto-grow
                          hide-details
                          :readonly="segment.reviewStatus === 'confirmed' || isApproved"
                          :aria-label="segmentLabel(segment)"
                          @change="saveSegment(segment.id, 'content', $event)"
                        />
                        <v-alert v-if="segment.reviewStatus === 'returned' && latestReturn(segment)" class="mt-3" type="error" variant="tonal" density="compact">
                          退回意见：{{ latestReturn(segment)!.note }}
                        </v-alert>
                        <div v-if="segment.reviewLog.length" class="review-log mt-2">
                          <div v-for="entry in segment.reviewLog" :key="entry.id" class="review-log-entry">
                            <v-icon size="14" :icon="entry.type === 'return' ? 'mdi-alert-circle-outline' : 'mdi-reply-outline'" />
                            <span>{{ entry.type === 'return' ? '退回意见' : '处理说明' }} · {{ formatTime(entry.createdAt) }}：{{ entry.note }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="4">
                  <v-card class="script-card pa-5 mb-5">
                    <div class="d-flex align-center justify-space-between mb-3">
                      <div class="section-title">待处理段落</div>
                      <v-chip size="x-small" variant="tonal" :color="store.todoSegments.length ? 'warning' : 'success'">{{ store.todoSegments.length }}</v-chip>
                    </div>
                    <v-alert v-if="!store.todoSegments.length" type="success" variant="tonal" density="compact">
                      全部段落已确认{{ canReview ? '，可以定稿' : '' }}。
                    </v-alert>
                    <v-list v-else density="compact" class="bg-transparent" nav>
                      <v-list-item
                        v-for="segment in store.todoSegments"
                        :key="segment.id"
                        rounded="lg"
                        :aria-label="`跳到段落：${segmentLabel(segment)}`"
                        @click="jumpToSegment(segment.id)"
                      >
                        <template #prepend>
                          <v-icon size="18" :color="segmentStatusMeta(segment.reviewStatus).color" :icon="segmentStatusMeta(segment.reviewStatus).icon" />
                        </template>
                        <v-list-item-title>{{ segmentLabel(segment) }}</v-list-item-title>
                        <v-list-item-subtitle>{{ segment.reviewStatus === 'returned' ? '已退回，待作者处理' : '待专家确认' }}</v-list-item-subtitle>
                        <template #append><v-icon size="16" icon="mdi-arrow-right" /></template>
                      </v-list-item>
                    </v-list>
                  </v-card>

                  <v-card class="script-card pa-5">
                    <div class="section-title mb-4">同展项语言进度</div>
                    <div v-for="lang in LANGUAGES" :key="lang.id" class="d-flex align-center ga-3 mb-4">
                      <v-progress-circular :model-value="store.completionFor(exhibit!, lang.id)" size="52" width="5" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'">
                        {{ store.completionFor(exhibit!, lang.id) }}
                      </v-progress-circular>
                      <div class="flex-grow-1">
                        <div class="font-weight-medium">{{ lang.label }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ exhibit?.drafts.find(item => item.languageId === lang.id) ? store.statusLabel(exhibit!.drafts.find(item => item.languageId === lang.id)!.status) : '尚未创建' }}
                        </div>
                      </div>
                      <v-btn size="small" variant="text" :disabled="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">切换</v-btn>
                    </div>
                  </v-card>
                  <v-card class="script-card pa-5 mt-5">
                    <div class="section-title mb-3">审校检查</div>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item :prepend-icon="draft.narration.length > 80 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`讲解词 ${draft.narration.length} 字`" />
                      <v-list-item :prepend-icon="draft.accessibility.length > 30 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`无障碍描述 ${draft.accessibility.length} 字`" />
                      <v-list-item :prepend-icon="draft.sources ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="draft.sources ? '资料来源已填写' : '缺少资料来源'" />
                    </v-list>
                    <v-alert class="mt-3" type="info" variant="tonal" density="compact">
                      估算语速约 {{ Math.max(1, Math.round(draft.narration.length / 220 * 10) / 10) }} 分钟，请与目标时长核对。
                    </v-alert>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="versions">
              <v-card class="script-card pa-4 pa-md-6">
                <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                  <div>
                    <div class="section-title">版本比较</div>
                    <div class="text-h6 font-weight-bold mt-1">选择同一展项、同一语言的两个快照</div>
                  </div>
                  <v-btn color="primary" prepend-icon="mdi-content-save-plus-outline" @click="versionDialog = true">保存当前版本</v-btn>
                </div>
                <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                  恢复版本会连同段落锁定与审校意见一起还原，稿件重新进入待审；已定稿语言需先“开启修订”才能恢复。
                </v-alert>
                <v-alert v-if="versions.length < 2" type="info" variant="tonal">至少保存两个版本后即可比较。当前有 {{ versions.length }} 个版本。</v-alert>
                <template v-else>
                  <v-row>
                    <v-col cols="12" md="6"><v-select v-model="compareA" :items="versions" item-title="name" item-value="id" label="基准版本" /></v-col>
                    <v-col cols="12" md="6"><v-select v-model="compareB" :items="versions" item-title="name" item-value="id" label="目标版本" /></v-col>
                  </v-row>
                  <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
                    <span><span class="status-dot" style="background:#9b2c25" /> 删除</span>
                    <span><span class="status-dot" style="background:#2f6b45" /> 新增</span>
                  </div>
                  <div class="rounded-lg border pa-3 bg-white">
                    <p v-for="(line, index) in diffLines" :key="index" class="diff-line" :class="`diff-${line.type}`">{{ line.text }}</p>
                    <div v-if="!diffLines.length" class="text-medium-emphasis pa-4">所选版本内容一致。</div>
                  </div>
                  <v-list class="mt-4 bg-transparent">
                    <v-list-item v-for="version in versions" :key="version.id" :title="version.name" :subtitle="formatTime(version.createdAt)">
                      <template #append>
                        <v-btn variant="outlined" size="small" :disabled="isApproved" :title="isApproved ? '已定稿语言不能直接覆盖，请先开启修订' : ''" @click="store.restoreVersion(version.id)">恢复此版</v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </template>
              </v-card>
            </v-window-item>

            <v-window-item value="preview">
              <v-card class="script-card pa-4 pa-md-6">
                <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                  <div>
                    <div class="section-title">设备排版预览</div>
                    <div class="text-h6 font-weight-bold mt-1">以展项实际阅读顺序预览</div>
                  </div>
                  <v-btn-toggle v-model="device" mandatory variant="outlined" divided>
                    <v-btn v-for="item in deviceOptions" :key="item.value" :value="item.value">{{ item.label }}</v-btn>
                  </v-btn-toggle>
                </div>
                <div class="preview-frame" :class="device">
                  <div class="preview-content">
                    <div class="text-overline text-medium-emphasis">{{ exhibit?.code }} · {{ currentLanguage?.label }}</div>
                    <h2 class="text-h4 font-weight-bold mt-2">{{ draft.title }}</h2>
                    <p class="text-body-1 mt-6" style="line-height:1.9;white-space:pre-wrap">{{ draft.narration }}</p>
                    <v-divider class="my-6" />
                    <div class="section-title">无障碍描述</div>
                    <p class="text-body-2 mt-2" style="line-height:1.8;white-space:pre-wrap">{{ draft.accessibility }}</p>
                    <div class="mt-7 text-caption text-medium-emphasis">预计讲解 {{ draft.durationMinutes }} 分钟</div>
                  </div>
                </div>
              </v-card>
            </v-window-item>

            <v-window-item value="sources">
              <v-row>
                <v-col cols="12" md="7">
                  <v-card class="script-card pa-5">
                    <div class="section-title mb-3">来源与核验记录</div>
                    <v-textarea :model-value="draft.sources" rows="8" :readonly="isApproved" @change="saveDraftField('sources', $event)" />
                    <v-alert class="mt-4" type="warning" variant="tonal">发布前请由内容负责人逐条核对来源。当前无障碍描述与实物尺寸需由教育部门复核。</v-alert>
                  </v-card>
                </v-col>
                <v-col cols="12" md="5">
                  <v-card class="script-card pa-5">
                    <div class="section-title mb-3">段落审校概况</div>
                    <v-timeline density="compact" side="end">
                      <v-timeline-item v-for="segment in draft.segments" :key="segment.id" :dot-color="segmentStatusMeta(segment.reviewStatus).color" size="small">
                        <div class="font-weight-medium">{{ segment.label }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ segmentStatusMeta(segment.reviewStatus).label }}<template v-if="segment.reviewLog.length"> · {{ segment.reviewLog.length }} 条审校记录</template>
                        </div>
                      </v-timeline-item>
                    </v-timeline>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </div>
        <v-empty-state v-else icon="mdi-script-text-outline" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
      </div>
    </v-main>

    <v-dialog v-model="versionDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>保存版本快照</v-card-title>
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">将当前“{{ draft?.title }}”的完整内容、段落锁定与审校意见保存为只读版本。</p>
          <v-text-field v-model="versionName" label="版本名称（可选）" autofocus @keyup.enter="submitVersion" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="versionDialog = false">取消</v-btn><v-btn color="primary" @click="submitVersion">保存快照</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="440" @update:model-value="deleteTarget = null">
      <v-card class="pa-3">
        <v-card-title>删除这个段落？</v-card-title>
        <v-card-text>删除后可使用撤销恢复。</v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="deleteTarget = null">取消</v-btn><v-btn color="error" @click="confirmDelete">删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(returnTarget)" max-width="520" @update:model-value="returnTarget = null">
      <v-card class="pa-3">
        <v-card-title>退回这个段落</v-card-title>
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">请写明退回原因，作者处理后可重新提交；已确认的其他段落保持锁定。</p>
          <v-textarea
            v-model="returnReason"
            label="退回原因（必填）"
            rows="3"
            auto-grow
            autofocus
            :error="!returnReason.trim()"
            :error-messages="returnReason.trim() ? '' : '退回时必须写明原因'"
            @keyup.ctrl.enter="submitReturn"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="returnTarget = null">取消</v-btn>
          <v-btn color="error" :disabled="!returnReason.trim()" @click="submitReturn">退回该段</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(resubmitTarget)" max-width="520" @update:model-value="resubmitTarget = null">
      <v-card class="pa-3">
        <v-card-title>重新提交这个段落</v-card-title>
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">提交后退回标记消失，段落回到待确认；此前的退回意见仍保留在审校记录中。</p>
          <v-textarea v-model="resubmitNote" label="处理说明（可选）" rows="3" auto-grow autofocus hint="说明修改内容，方便专家复核" persistent-hint @keyup.ctrl.enter="submitResubmit" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="resubmitTarget = null">取消</v-btn>
          <v-btn color="primary" @click="submitResubmit">重新提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="helpDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>键盘操作</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item prepend-icon="mdi-apple-keyboard-command" title="Ctrl / ⌘ + Z" subtitle="撤销上一步编辑" />
            <v-list-item prepend-icon="mdi-redo" title="Ctrl / ⌘ + Shift + Z" subtitle="重做" />
            <v-list-item prepend-icon="mdi-content-save-outline" title="Ctrl / ⌘ + S" subtitle="保存当前版本快照" />
            <v-list-item prepend-icon="mdi-keyboard-tab" title="Tab / Shift + Tab" subtitle="在字段、状态与段落操作之间移动" />
          </v-list>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn color="primary" @click="helpDialog = false">知道了</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar :model-value="Boolean(store.notice)" timeout="2600" location="bottom right" @update:model-value="store.notice = ''">
      {{ store.notice }}
      <template #actions><v-btn variant="text" @click="store.notice = ''">关闭</v-btn></template>
    </v-snackbar>
  </v-app>
</template>
