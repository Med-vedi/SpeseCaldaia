import { useState } from 'react'
import { Modal, Upload, Button, message, App } from 'antd'
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

interface FileUploadModalProps {
    open: boolean
    onClose: () => void
    onUpload: (data: Record<string, { kCal: number; m3: number }>) => void
}

const FileUploadModal = ({ open, onClose, onUpload }: FileUploadModalProps) => {
    const { message: messageApi } = App.useApp()
    const [fileList, setFileList] = useState<any[]>([])

    const handleFileRead = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                resolve(e.target?.result as string)
            }
            reader.onerror = reject
            reader.readAsText(file)
        })
    }

    const parseCSV = (csvText: string): Record<string, { kCal: number; m3: number }> => {
        const lines = csvText.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

        const data: Record<string, { kCal: number; m3: number }> = {}

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            const nameIndex = headers.indexOf('nome') >= 0 ? headers.indexOf('nome') : 0
            const kCalIndex = headers.indexOf('kcal') >= 0 ? headers.indexOf('kcal') : -1
            const m3Index = headers.indexOf('m3') >= 0 ? headers.indexOf('m3') : -1

            if (nameIndex >= 0) {
                const name = values[nameIndex].toLowerCase()
                const userKey = name === 'vladi' ? 'vladi' : name === 'dino' ? 'dino' : name === 'cristian' ? 'cristian' : null

                if (userKey) {
                    data[userKey] = {
                        kCal: kCalIndex >= 0 ? parseFloat(values[kCalIndex]) || 0 : 0,
                        m3: m3Index >= 0 ? parseInt(values[m3Index]) || 0 : 0,
                    }
                }
            }
        }

        return data
    }

    const parseJSON = (jsonText: string): Record<string, { kCal: number; m3: number }> => {
        const data = JSON.parse(jsonText)
        const result: Record<string, { kCal: number; m3: number }> = {}

        const userMap: Record<string, string> = {
            vladi: 'vladi',
            dino: 'dino',
            cristian: 'cristian',
        }

        Object.keys(data).forEach(key => {
            const userKey = userMap[key.toLowerCase()]
            if (userKey && data[key]) {
                result[userKey] = {
                    kCal: data[key].kCal || data[key].kcal || 0,
                    m3: data[key].m3 || data[key].m3 || 0,
                }
            }
        })

        return result
    }

    const uploadProps: UploadProps = {
        beforeUpload: async (file) => {
            try {
                const fileContent = await handleFileRead(file)
                let parsedData: Record<string, { kCal: number; m3: number }> = {}

                if (file.name.endsWith('.csv')) {
                    parsedData = parseCSV(fileContent)
                } else if (file.name.endsWith('.json')) {
                    parsedData = parseJSON(fileContent)
                } else {
                    messageApi.error('Formato file non supportato. Usa CSV o JSON.')
                    return false
                }

                if (Object.keys(parsedData).length === 0) {
                    messageApi.error('Nessun dato valido trovato nel file.')
                    return false
                }

                onUpload(parsedData)
                messageApi.success('File caricato con successo!')
                setFileList([])
                onClose()
                return false
            } catch (error) {
                messageApi.error('Errore durante la lettura del file.')
                return false
            }
        },
        fileList,
        onChange: ({ fileList: newFileList }) => {
            setFileList(newFileList)
        },
        accept: '.csv,.json',
        maxCount: 1,
    }

    const handleDownloadTemplate = () => {
        const template = {
            vladi: { kCal: 0, m3: 0 },
            dino: { kCal: 0, m3: 0 },
            cristian: { kCal: 0, m3: 0 },
        }

        const jsonStr = JSON.stringify(template, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'template-letture.json'
        link.click()
        URL.revokeObjectURL(url)

        messageApi.success('Template scaricato!')
    }

    return (
        <Modal
            title="Carica File Letture"
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="template" icon={<FileTextOutlined />} onClick={handleDownloadTemplate}>
                    Scarica Template
                </Button>,
                <Button key="cancel" onClick={onClose}>
                    Annulla
                </Button>,
            ]}
        >
            <div style={{ padding: '20px 0' }}>
                <Upload.Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                        <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">Clicca o trascina il file qui per caricarlo</p>
                    <p className="ant-upload-hint">
                        Supporta file CSV o JSON. Formato JSON: {`{ "vladi": { "kCal": 0, "m3": 0 }, ... }`}
                    </p>
                </Upload.Dragger>
            </div>
        </Modal>
    )
}

export default FileUploadModal

