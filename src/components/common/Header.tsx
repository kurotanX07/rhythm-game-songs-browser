// src/components/common/Header.tsx
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton,
  Box, Menu, MenuItem, Avatar, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider, useMediaQuery,
  Tooltip, Badge, Chip
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header: React.FC = () => {
  const { currentUser, isAdmin, isPremium, signOut } = useAuth();
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const { mode, toggleColorMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      handleClose();
      navigate('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };
  
  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };
  
  return (
    <AppBar position="static">
      <Toolbar sx={{ 
        minHeight: isMobile ? '48px !important' : '64px',
        padding: isMobile ? '0 8px !important' : '0 16px',
      }}>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ 
              marginRight: 1, 
              padding: '8px',
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/"
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
            fontSize: isMobile ? '1rem' : '1.25rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          音ゲー広辞苑
        </Typography>
        
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/"
              startIcon={<HomeIcon />}
            >
              ホーム
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/songs"
              startIcon={<MusicNoteIcon />}
            >
              楽曲一覧
            </Button>
            {isAdmin && (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/admin"
                startIcon={<AdminPanelSettingsIcon />}
              >
                管理画面
              </Button>
            )}
            
            {/* Membership button - visible to all users */}
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/membership"
              startIcon={<WorkspacePremiumIcon />}
              sx={{ 
                position: 'relative',
                '&::after': isPremium ? {
                  content: '""',
                  position: 'absolute',
                  bottom: 6,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: 'secondary.main',
                  borderRadius: 1
                } : {}
              }}
            >
              会員プラン
              {isPremium && !isAdmin && (
                <Chip 
                  label="プレミアム" 
                  size="small" 
                  color="secondary"
                  sx={{ 
                    ml: 1, 
                    height: 18, 
                    fontSize: '0.6rem', 
                    fontWeight: 'bold',
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
              )}
            </Button>
          </Box>
        )}
        
        {/* Theme Toggle Button */}
        <Tooltip title={mode === 'light' ? 'ダークモード' : 'ライトモード'}>
          <IconButton 
            color="inherit" 
            onClick={toggleColorMode}
            sx={{ 
              mr: 1,
              padding: isMobile ? '8px' : '12px',
              '& .MuiSvgIcon-root': {
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }
            }}
          >
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Tooltip>
        
        {currentUser ? (
          <Box>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ 
                padding: isMobile ? '4px' : '8px',
              }}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  isPremium && !isAdmin ? (
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: 'secondary.main',
                        border: `2px solid ${muiTheme.palette.primary.main}`,
                      }}
                    />
                  ) : null
                }
              >
                <Avatar 
                  alt={currentUser.displayName || undefined} 
                  src={currentUser.photoURL || undefined}
                  sx={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32 }}
                >
                  {!currentUser.photoURL && ((currentUser.displayName || currentUser.email || 'U')[0].toUpperCase())}
                </Avatar>
              </Badge>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <ListItemText 
                  primary={currentUser.email}
                  secondary={
                    isAdmin ? '管理者' : (isPremium ? 'プレミアム会員' : '無料会員')
                  }
                />
              </MenuItem>
              
              {/* Only show membership option for non-admin users */}
              {!isAdmin && (
                <MenuItem 
                  onClick={() => {
                    handleClose();
                    navigate('/membership');
                  }}
                >
                  <ListItemIcon>
                    <WorkspacePremiumIcon 
                      fontSize="small"
                      color={isPremium ? "secondary" : "inherit"}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={isPremium ? "会員ステータス" : "プレミアム会員になる"}
                  />
                </MenuItem>
              )}
              
              <Divider />
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="ログアウト" />
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/login"
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            ログイン
          </Button>
        )}
      </Toolbar>
      
      {/* Mobile Drawer - 幅を広げてタップしやすく */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            <ListItem button component={RouterLink} to="/" sx={{ py: 2 }}>
              <ListItemIcon><HomeIcon /></ListItemIcon>
              <ListItemText primary="ホーム" />
            </ListItem>
            <ListItem button component={RouterLink} to="/songs" sx={{ py: 2 }}>
              <ListItemIcon><MusicNoteIcon /></ListItemIcon>
              <ListItemText primary="楽曲一覧" />
            </ListItem>
            {isAdmin && (
              <ListItem button component={RouterLink} to="/admin" sx={{ py: 2 }}>
                <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="管理画面" />
              </ListItem>
            )}
            
            {/* Add membership to drawer */}
            <ListItem button component={RouterLink} to="/membership" sx={{ py: 2 }}>
              <ListItemIcon>
                <WorkspacePremiumIcon color={isPremium ? "secondary" : "inherit"} />
              </ListItemIcon>
              <ListItemText 
                primary="会員プラン"
                secondary={isPremium && !isAdmin ? "プレミアム会員" : null}
              />
            </ListItem>
          </List>
          <Divider />
          
          {/* Theme Toggle Option in Drawer */}
          <ListItem button onClick={toggleColorMode} sx={{ py: 2 }}>
            <ListItemIcon>
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </ListItemIcon>
            <ListItemText primary={mode === 'light' ? 'ダークモード' : 'ライトモード'} />
          </ListItem>
          <Divider />
          
          {currentUser ? (
            <List>
              <ListItem sx={{ py: 2 }}>
                <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                <ListItemText 
                  primary={currentUser.displayName || currentUser.email}
                  secondary={isAdmin ? '管理者' : (isPremium ? 'プレミアム会員' : '無料会員')}
                  primaryTypographyProps={{ noWrap: true }} 
                />
              </ListItem>
              <ListItem button onClick={handleLogout} sx={{ py: 2 }}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="ログアウト" />
              </ListItem>
            </List>
          ) : (
            <List>
              <ListItem button component={RouterLink} to="/login" sx={{ py: 2 }}>
                <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                <ListItemText primary="ログイン" />
              </ListItem>
            </List>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;