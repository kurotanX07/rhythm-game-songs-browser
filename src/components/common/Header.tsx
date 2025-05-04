import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton,
  Box, Menu, MenuItem, Avatar, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { currentUser, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // メニュー状態
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
      <Toolbar>
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
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
            fontWeight: 'bold'
          }}
        >
          リズムゲーム楽曲ブラウザ
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
          </Box>
        )}
        
        {currentUser ? (
          <Box>
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar 
                alt={currentUser.displayName || undefined} 
                src={currentUser.photoURL || undefined}
                sx={{ width: 32, height: 32 }}
              >
                {!currentUser.photoURL && ((currentUser.displayName || currentUser.email || 'U')[0].toUpperCase())}
              </Avatar>
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
              <MenuItem onClick={handleClose}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={currentUser.email} />
              </MenuItem>
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
          >
            ログイン
          </Button>
        )}
      </Toolbar>
      
      {/* モバイルドロワー */}
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
            <ListItem button component={RouterLink} to="/">
              <ListItemIcon><HomeIcon /></ListItemIcon>
              <ListItemText primary="ホーム" />
            </ListItem>
            <ListItem button component={RouterLink} to="/songs">
              <ListItemIcon><MusicNoteIcon /></ListItemIcon>
              <ListItemText primary="楽曲一覧" />
            </ListItem>
            {isAdmin && (
              <ListItem button component={RouterLink} to="/admin">
                <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="管理画面" />
              </ListItem>
            )}
          </List>
          <Divider />
          {currentUser ? (
            <List>
              <ListItem>
                <ListItemIcon><AccountCircleIcon /></ListItemIcon>
                <ListItemText 
                  primary={currentUser.displayName || currentUser.email}
                  primaryTypographyProps={{ noWrap: true }} 
                />
              </ListItem>
              <ListItem button onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="ログアウト" />
              </ListItem>
            </List>
          ) : (
            <List>
              <ListItem button component={RouterLink} to="/login">
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