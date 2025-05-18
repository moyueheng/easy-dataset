'use client';

import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

/**
 * 标签操作菜单组件
 * @param {Object} props
 * @param {HTMLElement} props.anchorEl - 菜单锚点元素
 * @param {boolean} props.open - 菜单是否打开
 * @param {Function} props.onClose - 关闭菜单的回调
 * @param {Function} props.onDelete - 删除操作的回调
 */
export default function TagMenu({ anchorEl, open, onClose, onDelete }) {
  const { t } = useTranslation();

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem onClick={onDelete}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('common.delete')}</ListItemText>
      </MenuItem>
    </Menu>
  );
}
