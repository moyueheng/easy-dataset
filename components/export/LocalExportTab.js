// LocalExportTab.js 组件
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  Checkbox,
  Typography,
  Box,
  Paper,
  useTheme,
  Grid,
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableContainer
} from '@mui/material';

const LocalExportTab = ({
  fileFormat,
  formatType,
  systemPrompt,
  confirmedOnly,
  includeCOT,
  customFields,
  alpacaFieldType,
  customInstruction,
  handleFileFormatChange,
  handleFormatChange,
  handleSystemPromptChange,
  handleConfirmedOnlyChange,
  handleIncludeCOTChange,
  handleCustomFieldChange,
  handleIncludeLabelsChange,
  handleIncludeChunkChange,
  handleAlpacaFieldTypeChange,
  handleCustomInstructionChange,
  handleExport
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // 自定义格式的示例
  const getCustomFormatExample = () => {
    const { questionField, answerField, cotField, includeLabels, includeChunk } = customFields;
    const example = {
      [questionField]: '问题内容',
      [answerField]: '答案内容'
    };

    // 如果包含思维链字段，添加到示例中
    if (includeCOT) {
      example[cotField] = '思维链过程内容';
    }

    if (includeLabels) {
      example.labels = ['领域标签1'];
    }

    if (includeChunk) {
      example.chunk = '文本块';
    }

    return fileFormat === 'json' ? JSON.stringify([example], null, 2) : JSON.stringify(example);
  };

  // CSV 自定义格式化示例
  const getPreviewData = () => {
    if (formatType === 'alpaca') {
      // 根据选择的字段类型生成不同的示例
      if (alpacaFieldType === 'instruction') {
        return {
          headers: ['instruction', 'input', 'output', 'system'],
          rows: [
            {
              instruction: '人类指令（必填）',
              input: '',
              output: '模型回答（必填）',
              system: '系统提示词（选填）'
            },
            {
              instruction: '第二个指令',
              input: '',
              output: '第二个回答',
              system: '系统提示词'
            }
          ]
        };
      } else {
        // input
        return {
          headers: ['instruction', 'input', 'output', 'system'],
          rows: [
            {
              instruction: customInstruction || '固定的指令内容',
              input: '人类问题（必填）',
              output: '模型回答（必填）',
              system: '系统提示词（选填）'
            },
            {
              instruction: customInstruction || '固定的指令内容',
              input: '第二个问题',
              output: '第二个回答',
              system: '系统提示词'
            }
          ]
        };
      }
    } else if (formatType === 'sharegpt') {
      return {
        headers: ['messages'],
        rows: [
          {
            messages: JSON.stringify(
              [
                {
                  messages: [
                    {
                      role: 'system',
                      content: '系统提示词（选填）'
                    },
                    {
                      role: 'user',
                      content: '人类指令' // 映射到 question 字段
                    },
                    {
                      role: 'assistant',
                      content: '模型回答' // 映射到 cot+answer 字段
                    }
                  ]
                }
              ],
              null,
              2
            )
          }
        ]
      };
    } else if (formatType === 'custom') {
      const headers = [customFields.questionField, customFields.answerField];
      if (includeCOT) headers.push(customFields.cotField);
      if (customFields.includeLabels) headers.push('labels');
      if (customFields.includeChunk) headers.push('chunkId');

      const row = {
        [customFields.questionField]: '问题内容',
        [customFields.answerField]: '答案内容'
      };
      if (includeCOT) row[customFields.cotField] = '思维链过程内容';
      if (customFields.includeLabels) row.labels = '领域标签';
      if (customFields.includeChunk) row.chunkId = '文本块';
      return {
        headers,
        rows: [row]
      };
    }
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.fileFormat')}
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            aria-label="fileFormat"
            name="fileFormat"
            value={fileFormat}
            onChange={handleFileFormatChange}
            row
          >
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
            <FormControlLabel value="jsonl" control={<Radio />} label="JSONL" />
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* 数据集风格 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.format')}
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup aria-label="format" name="format" value={formatType} onChange={handleFormatChange} row>
            <FormControlLabel value="alpaca" control={<Radio />} label="Alpaca" />
            <FormControlLabel value="sharegpt" control={<Radio />} label="ShareGPT" />
            <FormControlLabel value="custom" control={<Radio />} label={t('export.customFormat')} />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Alpaca 格式特有的设置 */}
      {formatType === 'alpaca' && (
        <Box sx={{ mb: 3, pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.alpacaSettings') || 'Alpaca 格式设置'}
          </Typography>
          <FormControl component="fieldset">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('export.questionFieldType') || '问题字段类型'}
            </Typography>
            <RadioGroup
              aria-label="alpacaFieldType"
              name="alpacaFieldType"
              value={alpacaFieldType}
              onChange={handleAlpacaFieldTypeChange}
              row
            >
              <FormControlLabel
                value="instruction"
                control={<Radio />}
                label={t('export.useInstruction') || '使用 instruction 字段'}
              />
              <FormControlLabel value="input" control={<Radio />} label={t('export.useInput') || '使用 input 字段'} />
            </RadioGroup>

            {alpacaFieldType === 'input' && (
              <TextField
                fullWidth
                size="small"
                label={t('export.customInstruction') || '自定义 instruction 字段内容'}
                value={customInstruction}
                onChange={handleCustomInstructionChange}
                margin="normal"
                placeholder={t('export.instructionPlaceholder') || '请输入固定的指令内容'}
                helperText={
                  t('export.instructionHelperText') || '当使用 input 字段时，可以在这里指定固定的 instruction 内容'
                }
              />
            )}
          </FormControl>
        </Box>
      )}

      {/* 自定义格式选项 */}
      {formatType === 'custom' && (
        <Box sx={{ mb: 3, pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.customFormatSettings')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.questionFieldName')}
                value={customFields.questionField}
                onChange={handleCustomFieldChange('questionField')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.answerFieldName')}
                value={customFields.answerField}
                onChange={handleCustomFieldChange('answerField')}
                margin="normal"
              />
            </Grid>
            {/* 添加思维链字段名输入框 */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.cotFieldName')}
                value={customFields.cotField}
                onChange={handleCustomFieldChange('cotField')}
                margin="normal"
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Checkbox checked={customFields.includeLabels} onChange={handleIncludeLabelsChange} size="small" />
            }
            label={t('export.includeLabels')}
          />
          {/* <FormControlLabel
            control={<Checkbox checked={customFields.includeChunk} onChange={handleIncludeChunkChange} size="small" />}
            label={t('export.includeChunk')}
          /> */}
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.example')}
        </Typography>

        {fileFormat === 'csv' ? (
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            {(() => {
              const { headers, rows } = getPreviewData();
              const tableKey = `${formatType}-${fileFormat}-${JSON.stringify(customFields)}`;
              return (
                <Table size="small" key={tableKey}>
                  <TableHead>
                    <TableRow>
                      {headers.map(header => (
                        <TableCell key={header}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={index}>
                        {headers.map(header => (
                          <TableCell key={header}>
                            {Array.isArray(row[header]) ? row[header].join(', ') : row[header] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </TableContainer>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
              overflowX: 'auto'
            }}
          >
            <pre style={{ margin: 0 }}>
              {formatType === 'custom'
                ? getCustomFormatExample()
                : formatType === 'alpaca'
                  ? fileFormat === 'json'
                    ? JSON.stringify(
                        [
                          {
                            instruction: '人类指令（必填）', // 映射到 question 字段
                            input: '人类输入（选填）',
                            output: '模型回答（必填）', // 映射到 cot+answer 字段
                            system: '系统提示词（选填）'
                          }
                        ],
                        null,
                        2
                      )
                    : '{"instruction": "人类指令（必填）", "input": "人类输入（选填）", "output": "模型回答（必填）", "system": "系统提示词（选填）"}\n{"instruction": "第二个指令", "input": "", "output": "第二个回答", "system": "系统提示词"}'
                  : fileFormat === 'json'
                    ? JSON.stringify(
                        [
                          {
                            messages: [
                              {
                                role: 'system',
                                content: '系统提示词（选填）'
                              },
                              {
                                role: 'user',
                                content: '人类指令' // 映射到 question 字段
                              },
                              {
                                role: 'assistant',
                                content: '模型回答' // 映射到 cot+answer 字段
                              }
                            ]
                          }
                        ],
                        null,
                        2
                      )
                    : '{"messages": [{"role": "system", "content": "系统提示词（选填）"}, {"role": "user", "content": "人类指令"}, {"role": "assistant", "content": "模型回答"}]}\n{"messages": [{"role": "user", "content": "第二个问题"}, {"role": "assistant", "content": "第二个回答"}]}'}
            </pre>
          </Paper>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.systemPrompt')}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          placeholder={t('export.systemPromptPlaceholder')}
          value={systemPrompt}
          onChange={handleSystemPromptChange}
        />
      </Box>

      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'row', gap: 4 }}>
        <FormControlLabel
          control={<Checkbox checked={confirmedOnly} onChange={handleConfirmedOnlyChange} />}
          label={t('export.onlyConfirmed')}
        />

        <FormControlLabel
          control={<Checkbox checked={includeCOT} onChange={handleIncludeCOTChange} />}
          label={t('export.includeCOT')}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={handleExport} variant="contained" sx={{ borderRadius: 2 }}>
          {t('export.confirmExport')}
        </Button>
      </Box>
    </>
  );
};

export default LocalExportTab;
