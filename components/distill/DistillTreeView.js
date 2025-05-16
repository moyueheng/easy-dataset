'use client';

import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogTitle,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import axios from 'axios';

/**
 * 蒸馏树形视图组件
 * @param {Object} props
 * @param {string} props.projectId - 项目ID
 * @param {Array} props.tags - 标签列表
 * @param {Function} props.onGenerateSubTags - 生成子标签的回调函数
 * @param {Function} props.onGenerateQuestions - 生成问题的回调函数
 */
const DistillTreeView = forwardRef(function DistillTreeView(
  { projectId, tags = [], onGenerateSubTags, onGenerateQuestions },
  ref
) {
  const { t } = useTranslation();
  const [expandedTags, setExpandedTags] = useState({});
  const [tagQuestions, setTagQuestions] = useState({});
  const [loadingTags, setLoadingTags] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedTagForMenu, setSelectedTagForMenu] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 获取问题统计信息
  const fetchQuestionsStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      setAllQuestions(response.data);
      console.log('获取问题统计信息成功:', { totalQuestions: response.data.length });
    } catch (error) {
      console.error('获取问题统计信息失败:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    fetchQuestionsStats
  }));

  // 获取标签下的问题
  const fetchQuestionsByTag = useCallback(
    async tagId => {
      try {
        setLoadingQuestions(prev => ({ ...prev, [tagId]: true }));
        const response = await axios.get(`/api/projects/${projectId}/distill/questions/by-tag?tagId=${tagId}`);
        setTagQuestions(prev => ({
          ...prev,
          [tagId]: response.data
        }));
      } catch (error) {
        console.error('获取标签问题失败:', error);
      } finally {
        setLoadingQuestions(prev => ({ ...prev, [tagId]: false }));
      }
    },
    [projectId]
  );

  // 初始化时获取问题统计信息
  useEffect(() => {
    fetchQuestionsStats();
  }, [fetchQuestionsStats]);

  // 构建标签树
  const tagTree = useMemo(() => {
    const rootTags = [];
    const tagMap = {};

    // 创建标签映射
    tags.forEach(tag => {
      tagMap[tag.id] = { ...tag, children: [] };
    });

    // 构建树结构
    tags.forEach(tag => {
      if (tag.parentId && tagMap[tag.parentId]) {
        tagMap[tag.parentId].children.push(tagMap[tag.id]);
      } else {
        rootTags.push(tagMap[tag.id]);
      }
    });

    return rootTags;
  }, [tags]);

  // 切换标签展开/折叠状态
  const toggleTag = useCallback(
    tagId => {
      setExpandedTags(prev => ({
        ...prev,
        [tagId]: !prev[tagId]
      }));

      // 如果展开且还没有加载过问题，则加载问题
      if (!expandedTags[tagId] && !tagQuestions[tagId]) {
        fetchQuestionsByTag(tagId);
      }
    },
    [expandedTags, tagQuestions, fetchQuestionsByTag]
  );

  // 处理菜单打开
  const handleMenuOpen = (event, tag) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTagForMenu(tag);
  };

  // 处理菜单关闭
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTagForMenu(null);
  };

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // 存储要删除的标签
  const [tagToDelete, setTagToDelete] = useState(null);

  // 打开删除确认对话框
  const openDeleteConfirm = () => {
    console.log('打开删除确认对话框', selectedTagForMenu);
    // 保存要删除的标签
    setTagToDelete(selectedTagForMenu);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  // 关闭删除确认对话框
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  // 处理删除标签
  const handleDeleteTag = () => {
    if (!tagToDelete) {
      console.log('没有要删除的标签信息');
      return;
    }

    console.log('开始删除标签:', tagToDelete.id, tagToDelete.label);

    // 先关闭确认对话框
    closeDeleteConfirm();

    // 执行删除操作
    const deleteTagAction = async () => {
      try {
        console.log('发送删除请求:', `/api/projects/${projectId}/tags?id=${tagToDelete.id}`);

        // 发送删除请求
        const response = await axios.delete(`/api/projects/${projectId}/tags?id=${tagToDelete.id}`);

        console.log('删除标签成功:', response.data);

        // 刷新页面
        window.location.reload();
      } catch (error) {
        console.error('删除标签失败:', error);
        console.error('错误详情:', error.response ? error.response.data : '无响应数据');
        alert(`删除标签失败: ${error.message}`);
      }
    };

    // 立即执行删除操作
    deleteTagAction();
  };

  // 处理删除问题
  const handleDeleteQuestion = async (questionId, event) => {
    event.stopPropagation();

    try {
      await axios.delete(`/api/projects/${projectId}/questions/${questionId}`);
      // 更新问题列表
      setTagQuestions(prev => {
        const newQuestions = { ...prev };
        Object.keys(newQuestions).forEach(tagId => {
          newQuestions[tagId] = newQuestions[tagId].filter(q => q.id !== questionId);
        });
        return newQuestions;
      });
    } catch (error) {
      console.error('删除问题失败:', error);
    }
  };

  // 获取标签路径
  const getTagPath = useCallback(
    tag => {
      if (!tag) return '';

      const findPath = (currentTag, path = []) => {
        const newPath = [currentTag.label, ...path];

        if (!currentTag.parentId) return newPath;

        const parentTag = tags.find(t => t.id === currentTag.parentId);
        if (!parentTag) return newPath;

        return findPath(parentTag, newPath);
      };

      return findPath(tag).join(' > ');
    },
    [tags]
  );

  /**
   * 按照标签前面的序号对标签进行排序
   * @param {Array} tags - 标签数组
   * @returns {Array} 排序后的标签数组
   */
  const sortTagsByNumber = useCallback(tags => {
    return [...tags].sort((a, b) => {
      // 提取标签前面的序号
      const getNumberPrefix = label => {
        // 匹配形如 1, 1.1, 1.1.2 的序号
        const match = label.match(/^([\d.]+)\s/);
        if (match) {
          return match[1]; // 返回完整的序号字符串，如 "1.10"
        }
        return null; // 没有序号
      };

      const aPrefix = getNumberPrefix(a.label);
      const bPrefix = getNumberPrefix(b.label);

      // 如果两个标签都有序号，按序号比较
      if (aPrefix && bPrefix) {
        // 将序号分解为数组，然后按数值比较
        const aParts = aPrefix.split('.').map(num => parseInt(num, 10));
        const bParts = bPrefix.split('.').map(num => parseInt(num, 10));

        // 比较序号数组
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i]; // 数值比较，确保 1.2 排在 1.10 前面
          }
        }
        // 如果前面的数字都相同，则较短的序号在前
        return aParts.length - bParts.length;
      }
      // 如果只有一个标签有序号，则有序号的在前
      else if (aPrefix) {
        return -1;
      } else if (bPrefix) {
        return 1;
      }
      // 如果都没有序号，则按原来的字母序排序
      else {
        return a.label.localeCompare(b.label, 'zh-CN');
      }
    });
  }, []);

  // 渲染标签树
  const renderTagTree = (tagList, level = 0) => {
    // 对同级标签进行排序
    const sortedTagList = sortTagsByNumber(tagList);

    return (
      <List disablePadding sx={{ px: 2 }}>
        {sortedTagList.map(tag => (
          <Box key={tag.id} sx={{ my: 0.5 }}>
            <ListItem
              disablePadding
              sx={{
                pl: level * 2,
                borderLeft: level > 0 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none',
                ml: level > 0 ? 2 : 0
              }}
            >
              <ListItemButton onClick={() => toggleTag(tag.id)} sx={{ borderRadius: 1, py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 'medium' }}>{tag.label}</Typography>
                      {tag.children && tag.children.length > 0 && (
                        <Chip
                          size="small"
                          label={`${(() => {
                            // 递归计算所有层级的子标签数量
                            const getTotalSubTagsCount = childrenTags => {
                              let count = childrenTags.length;
                              childrenTags.forEach(childTag => {
                                if (childTag.children && childTag.children.length > 0) {
                                  count += getTotalSubTagsCount(childTag.children);
                                }
                              });
                              return count;
                            };
                            return getTotalSubTagsCount(tag.children);
                          })()} ${t('distill.subTags')}`}
                          color="primary"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {/* 计算问题数量 - 包含所有子标签和自己的问题总和 */}
                      {(() => {
                        // 首先获取当前标签的问题数量
                        let currentTagQuestions = 0;
                        if (tagQuestions[tag.id] && tagQuestions[tag.id].length > 0) {
                          currentTagQuestions = tagQuestions[tag.id].length;
                        } else {
                          currentTagQuestions = allQuestions.filter(q => q.label === tag.label).length;
                        }

                        // 递归获取所有子标签的问题数量
                        const getChildrenQuestionsCount = childrenTags => {
                          let count = 0;
                          if (!childrenTags || childrenTags.length === 0) return 0;

                          childrenTags.forEach(childTag => {
                            // 子标签自己的问题
                            if (tagQuestions[childTag.id] && tagQuestions[childTag.id].length > 0) {
                              count += tagQuestions[childTag.id].length;
                            } else {
                              count += allQuestions.filter(q => q.label === childTag.label).length;
                            }

                            // 子标签的子标签的问题
                            if (childTag.children && childTag.children.length > 0) {
                              count += getChildrenQuestionsCount(childTag.children);
                            }
                          });

                          return count;
                        };

                        // 总问题数量 = 当前标签的问题 + 所有子标签的问题
                        const totalQuestions = currentTagQuestions + getChildrenQuestionsCount(tag.children || []);

                        return totalQuestions > 0 ? (
                          <Chip
                            size="small"
                            label={`${totalQuestions} ${t('distill.questions')}`}
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        ) : null;
                      })()}
                    </Box>
                  }
                  primaryTypographyProps={{ component: 'div' }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title={t('distill.generateQuestions')}>
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        // 包装函数，处理问题生成后的刷新
                        const handleGenerateQuestionsWithRefresh = async () => {
                          // 调用父组件传入的函数生成问题
                          await onGenerateQuestions(tag, getTagPath(tag));

                          // 生成问题后刷新数据
                          await fetchQuestionsStats();

                          // 如果标签已展开，刷新该标签的问题详情
                          if (expandedTags[tag.id]) {
                            await fetchQuestionsByTag(tag.id);
                          }
                        };

                        handleGenerateQuestionsWithRefresh();
                      }}
                    >
                      <QuestionMarkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={t('distill.generateSubTags')}>
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        onGenerateSubTags(tag, getTagPath(tag));
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <IconButton size="small" onClick={e => handleMenuOpen(e, tag)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>

                  {tag.children && tag.children.length > 0 ? (
                    expandedTags[tag.id] ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )
                  ) : null}
                </Box>
              </ListItemButton>
            </ListItem>

            {/* 子标签 */}
            {tag.children && tag.children.length > 0 && (
              <Collapse in={expandedTags[tag.id]} timeout="auto" unmountOnExit>
                {renderTagTree(tag.children, level + 1)}
              </Collapse>
            )}

            {/* 标签下的问题 */}
            {expandedTags[tag.id] && (
              <Collapse in={expandedTags[tag.id]} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ mt: 0.5, mb: 1 }}>
                  {loadingQuestions[tag.id] ? (
                    <ListItem sx={{ pl: (level + 1) * 2, py: 0.75 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ ml: 2 }}>
                        {t('common.loading')}
                      </Typography>
                    </ListItem>
                  ) : tagQuestions[tag.id] && tagQuestions[tag.id].length > 0 ? (
                    tagQuestions[tag.id].map(question => (
                      <ListItem
                        key={question.id}
                        sx={{
                          pl: (level + 1) * 2,
                          py: 0.75,
                          borderLeft: '1px dashed rgba(0, 0, 0, 0.1)',
                          ml: 2,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        secondaryAction={
                          <IconButton edge="end" size="small" onClick={e => handleDeleteQuestion(question.id, e)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: 'secondary.main' }}>
                          <HelpOutlineIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={question.question}
                          primaryTypographyProps={{
                            variant: 'body2',
                            style: {
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              paddingRight: '28px' // 留出删除按钮的空间
                            }
                          }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ pl: (level + 1) * 2, py: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('distill.noQuestions')}
                      </Typography>
                    </ListItem>
                  )}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
    );
  };

  // 标签操作菜单
  const tagMenu = (
    <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
      <MenuItem onClick={openDeleteConfirm}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('common.delete')}</ListItemText>
      </MenuItem>
    </Menu>
  );

  // 删除确认对话框
  const deleteConfirmDialog = (
    <Dialog
      open={deleteConfirmOpen}
      onClose={closeDeleteConfirm}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{t('distill.deleteTagConfirmTitle')}</DialogTitle>
      <DialogActions>
        <Button onClick={closeDeleteConfirm} color="primary">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleDeleteTag} color="error" autoFocus>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {tagTree.length > 0 ? (
        renderTagTree(tagTree)
      ) : (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {t('distill.noTags')}
          </Typography>
        </Box>
      )}
      {tagMenu}
      {deleteConfirmDialog}
    </Box>
  );
});

export default DistillTreeView;
