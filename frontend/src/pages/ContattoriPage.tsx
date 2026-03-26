import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react'
import { Card, Typography, Table, InputNumber, Button, Modal, Tooltip, Alert } from 'antd'
import { FireOutlined, DropboxOutlined, ThunderboltOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useReadings, type KCalRow, type M3Row, type KWRow } from '../contexts/ReadingsContext'
import { toFiniteNumberOrNull } from '../contexts/utils'
import type { CounterType } from '../store/api/models'
import UpdateReadingsDrawer from '../components/UpdateReadingsDrawer'
import FloatingCalculator from '../components/FloatingCalculator.tsx'

const { Title } = Typography

type MeterRow = KCalRow | M3Row | KWRow

const EUROPEAN_LOCALE = 'it-IT'

function formatEuropeanNumber(value: number, precision: number) {
  return new Intl.NumberFormat(EUROPEAN_LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

function parseEuropeanNumber(value: string | undefined) {
  if (!value) return NaN
  const cleaned = value.trim().replace(/\s/g, '')
  if (!cleaned) return NaN

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  // If both separators exist, the rightmost one is treated as decimal separator.
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Example: 85.814,3 -> 85814.3
      return Number(cleaned.replace(/\./g, '').replace(',', '.'))
    }
    // Example: 85,814.3 -> 85814.3
    return Number(cleaned.replace(/,/g, ''))
  }

  // Only comma present -> decimal comma.
  if (lastComma !== -1) {
    return Number(cleaned.replace(',', '.'))
  }

  // Only dot present -> dot decimal.
  return Number(cleaned)
}

function scrollMeterTablesToEnd(root: HTMLElement | null) {
  if (!root) return
  root.querySelectorAll<HTMLElement>('.ant-table-content').forEach((node) => {
    const max = node.scrollWidth - node.clientWidth
    if (max > 0) node.scrollLeft = max
  })
}

function toDisplayPersonName(name: string): string {
  const raw = name.replace(/\s*[-—]\s*Calore\s*$/i, '').trim()
  if (!raw) return name
  return raw
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase('it-IT') + w.slice(1).toLocaleLowerCase('it-IT') : ''))
    .filter(Boolean)
    .join(' ')
}

const ContattoriPage = () => {
  const {
    kCalData,
    m3Data,
    kWData,
    updateCounterValues,
    updateReadings,
    allCounterValues,
    counters,
    getAvailableYears,
    meterDisplayYearsAsc,
    organizationId,
    metersDataError,
    loading: readingsLoading,
    refreshData,
  } = useReadings()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const meterTablesRef = useRef<HTMLDivElement>(null)
  const [compactMeterNames, setCompactMeterNames] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const sync = () => setCompactMeterNames(window.innerWidth < 768)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const nameColWidth = compactMeterNames ? 52 : 140

  const yearsAsc = meterDisplayYearsAsc

  const [pendingValues, setPendingValues] = useState<Record<string, number | null>>({})
  const pendingUpdateRef = useRef<{
    counterId: string
    counterType: string
    year: number
    newValue: number | null
    originalValue: number | null
    inputKey: string
  } | null>(null)

  const getValueKey = (counterId: string | undefined, year: number): string =>
    counterId ? `${counterId}_${year}` : ''

  const getDisplayValue = useCallback(
    (counterId: string | undefined, year: number, originalValue: number | null): number | null => {
      if (!counterId) return originalValue
      const key = getValueKey(counterId, year)
      return pendingValues[key] !== undefined ? pendingValues[key] : originalValue
    },
    [pendingValues]
  )

  const handleConfirmUpdate = useCallback(() => {
    if (pendingUpdateRef.current) {
      const { counterId, counterType, year, newValue } = pendingUpdateRef.current
      if (newValue !== null) {
        updateCounterValues({
          counterType: counterType as CounterType,
          counterId,
          year,
          value: newValue,
        })
      }
      const key = getValueKey(counterId, year)
      setPendingValues((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      pendingUpdateRef.current = null
    }
  }, [updateCounterValues])

  const handleCancelUpdate = useCallback(() => {
    if (pendingUpdateRef.current) {
      const { counterId, year } = pendingUpdateRef.current
      const key = getValueKey(counterId, year)
      setPendingValues((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      pendingUpdateRef.current = null
    }
  }, [])

  const handleInputBlur = useCallback(
    (
      counterId: string,
      counterType: string,
      year: number,
      newValue: number | null,
      originalValue: number | null,
      precision: number = 1
    ) => {
      if (newValue !== originalValue && newValue !== null) {
        const key = getValueKey(counterId, year)
        pendingUpdateRef.current = {
          counterId,
          counterType,
          year,
          newValue,
          originalValue,
          inputKey: key,
        }
        setPendingValues((prev) => ({ ...prev, [key]: newValue }))

        const formatValue = (val: number | null) => {
          if (val === null) return 'N/A'
          return formatEuropeanNumber(val, precision)
        }

        Modal.confirm({
          title: 'Conferma aggiornamento',
          content: `Vuoi aggiornare il valore da ${formatValue(originalValue)} a ${formatValue(newValue)}?`,
          okText: 'Conferma',
          cancelText: 'Annulla',
          centered: true,
          onOk: handleConfirmUpdate,
          onCancel: handleCancelUpdate,
        })
      }
    },
    [handleConfirmUpdate, handleCancelUpdate]
  )

  const diffCell = (record: MeterRow, precision: number) => {
    const d = record.differenza
    const text =
      typeof d === 'number' && Number.isFinite(d)
        ? formatEuropeanNumber(d, precision)
        : '—'
    return (
      <span
        className="font-semibold tabular-nums block w-full min-h-[32px] leading-8 px-2 rounded bg-zinc-100 text-zinc-800 border border-zinc-200/80"
        title="Calcolato: ultimo anno − penultimo anno (non modificabile)"
      >
        {text}
      </span>
    )
  }

  const { kCalColumns, m3Columns, kWColumns } = useMemo(() => {
    const diffDisplayLabel =
      yearsAsc.length < 2
        ? 'Differenza'
        : compactMeterNames
          ? `Δ ${String(yearsAsc[yearsAsc.length - 2]).slice(-2)} → ${String(yearsAsc[yearsAsc.length - 1]).slice(-2)}`
          : `Δ ${yearsAsc[yearsAsc.length - 2]} → ${yearsAsc[yearsAsc.length - 1]}`

    const diffColumnTitle = (
      <Tooltip title="Calcolato automaticamente (ultimo anno − penultimo anno). Non è un campo modificabile.">
        <span className="cursor-help border-b border-dotted border-zinc-400">{diffDisplayLabel}</span>
      </Tooltip>
    )

    const renderYearCell = (year: number, record: MeterRow, precision: number) => {
      const isTotal = record.key === 'totale'
      const raw = toFiniteNumberOrNull(record.yearValues[year])

      if (isTotal) {
        if (raw === null) return <span>-</span>
        return (
          <span className="font-semibold">
            {formatEuropeanNumber(raw, precision)}
          </span>
        )
      }

      const displayValue = getDisplayValue(record.counterId, year, raw)

      return (
        <InputNumber
          value={displayValue}
          onChange={(val) => {
            if (record.counterId) {
              const key = getValueKey(record.counterId, year)
              setPendingValues((prev) => ({ ...prev, [key]: val }))
            }
          }}
          onBlur={() => {
            if (record.counterId && record.counterType) {
              handleInputBlur(
                record.counterId,
                record.counterType,
                year,
                displayValue,
                raw,
                precision
              )
            }
          }}
          style={{ width: '100%' }}
          precision={precision}
          controls={false}
          decimalSeparator=","
          formatter={(value, info) => {
            if (info.userTyping) {
              return info.input
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
              return formatEuropeanNumber(value, precision)
            }
            if (typeof value === 'string' && value !== '') {
              const parsed = parseEuropeanNumber(value)
              return Number.isFinite(parsed) ? formatEuropeanNumber(parsed, precision) : value
            }
            return ''
          }}
          parser={(value) => parseEuropeanNumber(value)}
        />
      )
    }

    const build = (unitLabel: string, precision: number): ColumnsType<MeterRow> => {
      const yearCols: ColumnsType<MeterRow> = yearsAsc.map((year) => ({
        title: compactMeterNames
          ? `${String(year).slice(-2)} (${unitLabel})`
          : `${year} (${unitLabel})`,
        key: `year-${year}`,
        width: 128,
        align: 'right' as const,
        render: (_: unknown, record: MeterRow) => renderYearCell(year, record, precision),
      }))

      return [
        {
          title: compactMeterNames ? '' : 'Contatore',
          dataIndex: 'name',
          key: 'name',
          width: nameColWidth,
          fixed: 'left' as const,
          render: (_: string, record: MeterRow) => {
            const name = toDisplayPersonName(record.name)
            const label = compactMeterNames ? name.slice(0, 2) : name
            return (
              <Tooltip title={compactMeterNames ? name : undefined}>
                <span className="font-medium">{label}</span>
              </Tooltip>
            )
          },
        },
        ...yearCols,
        {
          title: diffColumnTitle,
          dataIndex: 'differenza',
          key: 'differenza',
          width: 130,
          fixed: 'right' as const,
          align: 'right' as const,
          className: 'align-top',
          render: (_: number, record: MeterRow) => diffCell(record, precision),
        },
      ]
    }

    return {
      kCalColumns: build('kCal', 1),
      m3Columns: build('M³', 0),
      kWColumns: build('kW', 1),
    }
  }, [yearsAsc, getDisplayValue, handleInputBlur, compactMeterNames, nameColWidth])

  const tableScrollX = Math.min(nameColWidth + yearsAsc.length * 128 + 130, 4000)

  const yearsKey = yearsAsc.join(',')

  useLayoutEffect(() => {
    const root = meterTablesRef.current
    if (!root) return

    const apply = () => scrollMeterTablesToEnd(root)

    apply()
    const raf = requestAnimationFrame(apply)
    const t = window.setTimeout(apply, 150)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [tableScrollX, yearsKey, compactMeterNames, kCalData.length, m3Data.length, kWData.length])

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>
          Lettura contattori
        </Title>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setDrawerOpen(true)}
          size="large"
          className="w-full sm:w-auto"
        >
          Aggiorna
        </Button>
      </div>

      {!organizationId && !readingsLoading && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Profilo senza organization_id"
          description="Le letture non possono essere caricate. Verifica l’account in Supabase (tabella users, colonna organization_id) e che coincida con organization_id dei contatori."
        />
      )}
      {metersDataError && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="Errore caricamento dati"
          description={
            <span>
              {metersDataError}{' '}
              <Button type="link" className="p-0 h-auto align-baseline" onClick={() => void refreshData()}>
                Riprova
              </Button>
            </span>
          }
        />
      )}

      <div ref={meterTablesRef} className="flex flex-col gap-4 md:gap-6">
        <Card
          className="mobile-card-title-compact"
          title={
            <span className="text-sm md:text-base">
              <FireOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
              kCal - Contatore Calore
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table<KCalRow>
                columns={kCalColumns as ColumnsType<KCalRow>}
                dataSource={kCalData}
                pagination={false}
                bordered
                size="small"
                rowKey="key"
                rowClassName={(record) => (record.key === 'totale' ? 'bg-zinc-50 font-semibold' : '')}
                scroll={{ x: tableScrollX }}
              />
            </div>
          </div>
        </Card>

        <Card
          className="mobile-card-title-compact"
          title={
            <span className="text-sm md:text-base">
              <DropboxOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              M³ - Contatore Acqua
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table<M3Row>
                columns={m3Columns as ColumnsType<M3Row>}
                dataSource={m3Data}
                pagination={false}
                bordered
                size="small"
                rowKey="key"
                rowClassName={(record) => (record.key === 'totale' ? 'bg-zinc-50 font-semibold' : '')}
                scroll={{ x: tableScrollX }}
              />
            </div>
          </div>
        </Card>

        <Card
          className="mobile-card-title-compact"
          title={
            <span className="text-sm md:text-base">
              <ThunderboltOutlined style={{ marginRight: 8, color: '#faad14' }} />
              kW - Contatore Elettrico Comune (Organizzazione)
            </span>
          }
        >
          <div className="-mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <Table<KWRow>
                columns={kWColumns as ColumnsType<KWRow>}
                dataSource={kWData}
                pagination={false}
                bordered
                size="small"
                rowKey="key"
                rowClassName={(record) =>
                  record.counterType === 'electric_common' ? 'bg-zinc-50 font-semibold' : ''
                }
                scroll={{ x: tableScrollX }}
              />
            </div>
          </div>
        </Card>
      </div>

      <UpdateReadingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        kCalData={kCalData}
        m3Data={m3Data}
        allCounterValues={allCounterValues}
        counters={counters}
        availableYears={getAvailableYears()}
        onUpdate={updateReadings}
      />
      <FloatingCalculator />
    </div>
  )
}

export default ContattoriPage
