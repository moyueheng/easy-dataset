'use client';

import React, { useEffect, useState } from 'react';
import { FormControl, Select, MenuItem, useTheme, ListSubheader } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai/index';
import { modelConfigListAtom, selectedModelInfoAtom } from '@/lib/store';
import axios from 'axios';

export default function ModelSelect({ size = 'small', minWidth = 180, projectId, required = false, onError }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const models = useAtomValue(modelConfigListAtom);
  const [selectedModelInfo, setSelectedModelInfo] = useAtom(selectedModelInfoAtom);
  // 确保始终使用字符串值初始化 selectedModel，避免从非受控变为受控
  const [selectedModel, setSelectedModel] = useState(() => {
    if (selectedModelInfo && selectedModelInfo.id) {
      return selectedModelInfo.id;
    } else if (models && models.length > 0 && models[0]?.id) {
      return models[0].id;
    }
    return '';
  });
  const [error, setError] = useState(false);
  const handleModelChange = event => {
    if (!event || !event.target) return;
    const newModelId = event.target.value;

    // 清除错误状态
    if (error) {
      setError(false);
      if (onError) onError(false);
    }

    // 找到选中的模型对象
    const selectedModelObj = models.find(model => model.id === newModelId);
    if (selectedModelObj) {
      setSelectedModel(newModelId);
      // 将完整的模型信息存储到 localStorage
      setSelectedModelInfo(selectedModelObj);
      updateDefaultModel(newModelId);
    } else {
      setSelectedModelInfo({
        id: newModelId
      });
    }
  };

  const updateDefaultModel = async id => {
    const res = await axios.put(`/api/projects/${projectId}`, { projectId, defaultModelConfigId: id });
    if (res.status === 200) {
      console.log('更新成功');
    }
  };

  // 检查是否选择了模型
  const validateModel = () => {
    if (required && (!selectedModel || selectedModel === '')) {
      setError(true);
      if (onError) onError(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (selectedModelInfo && selectedModelInfo.id) {
      setSelectedModel(selectedModelInfo.id);
    }
  }, [selectedModelInfo]);

  // 初始检查
  useEffect(() => {
    if (required) {
      validateModel();
    }
  }, [required]);

  return (
    <FormControl size={size} sx={{ minWidth }} error={error}>
      <Select
        value={selectedModel}
        onChange={handleModelChange}
        displayEmpty
        variant="outlined"
        onBlur={validateModel}
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)',
          color: theme.palette.mode === 'dark' ? 'inherit' : 'white',
          borderRadius: '8px',
          '& .MuiSelect-icon': {
            color: theme.palette.mode === 'dark' ? 'inherit' : 'white'
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main'
          }
        }}
        MenuProps={{
          PaperProps: {
            elevation: 2,
            sx: { mt: 1, borderRadius: 2 }
          }
        }}
      >
        <MenuItem value="" disabled>
          {error ? t('models.pleaseSelectModel') : t('playground.selectModelFirst')}
        </MenuItem>
        {(() => {
          // 按 provider 分组
          const filteredModels = models.filter(m => {
            if (m.providerId?.toLowerCase() === 'ollama') {
              return m.modelName && m.endpoint;
            } else {
              return m.modelName && m.endpoint && m.apiKey;
            }
          });

          // 获取所有 provider
          const providers = [...new Set(filteredModels.map(m => m.providerName || 'Other'))];

          return providers.map(provider => {
            const providerModels = filteredModels.filter(m => (m.providerName || 'Other') === provider);
            return [
              <ListSubheader
                key={`header-${provider}`}
                sx={{
                  pl: 2,
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  mt: 1,
                  mb: 0.5
                }}
              >
                {provider || 'Other'}
              </ListSubheader>,
              ...providerModels.map(model => (
                <MenuItem key={model.id} value={model.id} sx={{ pl: 3 }}>
                  {model.modelName}
                </MenuItem>
              ))
            ];
          });
        })()}
      </Select>
    </FormControl>
  );
}
