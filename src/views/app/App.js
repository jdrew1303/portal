import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {Route, Switch} from 'react-router-dom'
import classNames from 'classnames'
import {
  withStyles, Drawer, AppBar, Toolbar, List,
  Typography, Divider, IconButton, ListItemIcon,
  ListItemText, ListItem, Hidden, Collapse,
} from '@material-ui/core'
import MenuIcon from '@material-ui/icons/Menu'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import ChevronRightIcon from '@material-ui/icons/ChevronRight'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'
import LoadingScreen from './LoadingScreen'
import {HomeRoute, appRouteBuilder} from './Routes'
import PermissionHandler from 'brain/security/permission/handler/Handler'
import {LoginClaims} from 'brain/security/auth/claims'

const drawerWidth = 220

const styles = theme => ({
  route: {
    display: 'flex',
    height: '100vh',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing.unit * 7 + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9 + 1,
    },
  },
  contentRoot: {
    flexGrow: 1,
    width: '100%',
    // height: '100%',
    padding: theme.spacing.unit * 2,
    paddingTop: '0',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns: '1fr',
    backgroundColor: theme.palette.background.main,
    overflow: 'scroll',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 4,
  },
  contentWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    overflow: 'scroll',
    paddingTop: theme.spacing.unit * 2,
  },
})

const buildContentRoutes = appRoutes => appRoutes.map(
    (routeSection, routeSectionIdx) => {
      let routes = []
      routeSection.forEach(
          (routeGroupOrRoute, routeGroupOrRouteIdx) => {
            if (routeGroupOrRoute.group) {
              let embeddedRoutes = []
              routeGroupOrRoute.routes.forEach(
                  (route, routeIdx) => {
                    if (route.component !== undefined) {
                      embeddedRoutes.push(<Route
                          key={`${routeSectionIdx}${routeGroupOrRouteIdx}${routeIdx}`}
                          exact
                          path={route.path}
                          render={props => <route.component {...props}/>}
                      />)
                    }
                  })
              routes = [...routes, ...embeddedRoutes]
            } else {
              if (routeGroupOrRoute.component !== undefined) {
                routes.push(<Route
                    key={`${routeSectionIdx}${routeGroupOrRouteIdx}`}
                    exact
                    path={routeGroupOrRoute.path}
                    render={props => <routeGroupOrRoute.component {...props}/>}
                />)
              }
            }
          })
      return routes
    })

const buildAppHeaderRoutes = appRoutes => appRoutes.map(
    (routeSection, routeSectionIdx) => {
      let routes = []
      routeSection.forEach(
          (routeGroupOrRoute, routeGroupOrRouteIdx) => {
            if (routeGroupOrRoute.group) {
              let embeddedRoutes = []
              routeGroupOrRoute.routes.forEach(
                  (route, routeIdx) => {
                    if (route.component !== undefined) {
                      embeddedRoutes.push(<Route
                          key={`${routeSectionIdx}${routeGroupOrRouteIdx}${routeIdx}`}
                          exact
                          path={route.path}
                          render={() => route.text}
                      />)
                    }
                  })
              routes = [...routes, ...embeddedRoutes]
            } else {
              if (routeGroupOrRoute.component !== undefined) {
                routes.push(<Route
                    key={`${routeSectionIdx}${routeGroupOrRouteIdx}`}
                    exact
                    path={routeGroupOrRoute.path}
                    render={() => routeGroupOrRoute.text}
                />)
              }
            }
          })
      return routes
    })

const states = {
  nop: 0,
  loading: 1,
}

const events = {
  init: states.loading,
  doneLoading: states.nop,
}

class App extends Component {
  constructor(props) {
    super(props)
    this.setup = this.setup.bind(this)
    this.renderMobileDrawerAndToolbar =
        this.renderMobileDrawerAndToolbar.bind(this)
    this.renderDesktopDrawerAndToolbar =
        this.renderDesktopDrawerAndToolbar.bind(this)
    this.renderDrawerMenus = this.renderDrawerMenus.bind(this)
    this.toggleMobileDrawer = this.toggleMobileDrawer.bind(this)
    this.toggleDesktopDrawer = this.toggleDesktopDrawer.bind(this)
    this.toggleMenuState = this.toggleMenuState.bind(this)
    this.changePath = this.changePath.bind(this)

    this.state = {
      open: true,
      mobileDrawerOpen: false,
      desktopDrawerOpen: true,
      menuState: {},
      route: HomeRoute,
      activeState: events.init,
    }

    this.appRoutes = []
    this.appContentRoutes = []
    this.appHeaderRoutes = []
  }

  componentDidMount() {
    this.setup()
  }

  componentDidUpdate(prevProps, prevState, snapShot) {
    const {
      claims: prevClaims,
      appDoneLoading: prevAppDoneLoading,
    } = prevProps
    const {
      claims,
      appDoneLoading,
    } = this.props

    if (
        (prevClaims.notExpired !== claims.notExpired) &&
        claims.notExpired
    ) {
      this.setup()
      return
    }

    if (
        (prevAppDoneLoading !== appDoneLoading)
        && appDoneLoading
    ) {
      this.setState({activeState: events.doneLoading})
    }
  }

  async setup() {
    const {
      claims,
      SetViewPermissions,
      AppDoneLoading,
    } = this.props

    // catch in case setup starts before claims are set
    // when the claims are set later on componentDidUpdate will catch
    // and start setup again
    if (!claims.notExpired) {

      return
    }

    let viewPermissions = []
    try {
      const response = await PermissionHandler.GetAllUsersViewPermissions(
          claims.userId)
      // update view permissions in state
      SetViewPermissions(response.permission)
      viewPermissions = response.permission
    } catch (e) {
      console.error('error getting view permissions', e)
    }

    try {
      // build app routes
      this.appRoutes = appRouteBuilder(claims.partyType, viewPermissions)
      this.appContentRoutes = buildContentRoutes(this.appRoutes)
      this.appHeaderRoutes = buildAppHeaderRoutes(this.appRoutes)
      let menuState = {}
      this.appRoutes.forEach((routeSection, routeSectionIdx) => {
        if (!menuState.hasOwnProperty(`${routeSectionIdx}`)) {
          menuState[`${routeSectionIdx}`] = {}
        }
        routeSection.forEach((routeGroupOrRoute, routeGroupOrRouteIdx) => {
          if (routeGroupOrRoute.group) {
            menuState[`${routeSectionIdx}`][`${routeGroupOrRouteIdx}`] = false
          }
        })
      })
      this.setState({menuState})
    } catch (e) {
      console.error('error building app routes', e)
    }

    // all data for the app is done loading, indicate
    AppDoneLoading()
  }

  toggleDesktopDrawer() {
    this.setState({desktopDrawerOpen: !this.state.desktopDrawerOpen})
  }

  toggleMobileDrawer() {
    this.setState({mobileDrawerOpen: !this.state.mobileDrawerOpen})
  }

  toggleMenuState(routeSectionIdx, routeGroupOrRouteIdx) {
    let {
      menuState,
    } = this.state
    menuState[`${routeSectionIdx}`][`${routeGroupOrRouteIdx}`] =
        !menuState[`${routeSectionIdx}`][`${routeGroupOrRouteIdx}`]
    this.setState(menuState)
  }

  changePath(route, usedMobileDrawer) {
    const {
      history,
      Logout,
    } = this.props

    if (route.path === '/logout') {
      Logout()
      history.push(route.path)
      return
    }

    if (usedMobileDrawer) {
      this.setState({
        mobileDrawerOpen: false,
        route,
      })
    } else {
      this.setState({route})
    }
    history.push(route.path)
  }

  render() {
    const {
      classes,
    } = this.props
    const {
      activeState,
    } = this.state

    switch (activeState) {
      case states.loading:
        return <LoadingScreen/>

      default:
        return <div className={classes.route}>
          <Hidden smDown>
            {this.renderDesktopDrawerAndToolbar()}
          </Hidden>
          <Hidden mdUp>
            {this.renderMobileDrawerAndToolbar()}
          </Hidden>
          <div className={classes.contentRoot}>
            <div className={classes.toolbar}/>
            <div className={classes.contentWrapper}>
              <div>
                <Switch>
                  {this.appContentRoutes}
                </Switch>
              </div>
            </div>
          </div>
        </div>
    }
  }

  renderDesktopDrawerAndToolbar() {
    const {classes, theme} = this.props
    const {desktopDrawerOpen} = this.state

    return <React.Fragment>
      <AppBar
          position='fixed'
          className={classNames(classes.appBar, {
            [classes.appBarShift]: desktopDrawerOpen,
          })}
      >
        <Toolbar disableGutters={!desktopDrawerOpen}>
          <IconButton
              color='inherit'
              aria-label='Open drawer'
              onClick={this.toggleDesktopDrawer}
              className={classNames(classes.menuButton, {
                [classes.hide]: desktopDrawerOpen,
              })}
          >
            <MenuIcon/>
          </IconButton>
          <Typography variant='h6' color='inherit' noWrap>
            <Switch>
              {this.appHeaderRoutes}
            </Switch>
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
          variant='permanent'
          className={classNames(classes.drawer, {
            [classes.drawerOpen]: desktopDrawerOpen,
            [classes.drawerClose]: !desktopDrawerOpen,
          })}
          classes={{
            paper: classNames({
              [classes.drawerOpen]: desktopDrawerOpen,
              [classes.drawerClose]: !desktopDrawerOpen,
            }),
          }}
          open={desktopDrawerOpen}
      >
        <div className={classes.toolbar}>
          <IconButton onClick={this.toggleDesktopDrawer}>
            {theme.direction === 'rtl' ?
                <ChevronRightIcon/> :
                <ChevronLeftIcon/>}
          </IconButton>
        </div>
        <Divider/>
        {this.renderDrawerMenus()}
      </Drawer>
    </React.Fragment>
  }

  renderMobileDrawerAndToolbar() {
    const {classes, theme} = this.props
    const {mobileDrawerOpen} = this.state

    return <React.Fragment>
      <AppBar
          position='fixed'
          className={classNames(classes.appBar, {
            [classes.appBarShift]: mobileDrawerOpen,
          })}
      >
        <Toolbar disableGutters={!mobileDrawerOpen}>
          <IconButton
              color='inherit'
              aria-label='Open drawer'
              onClick={this.toggleMobileDrawer}
              className={classNames(classes.menuButton, {
                [classes.hide]: mobileDrawerOpen,
              })}
          >
            <MenuIcon/>
          </IconButton>
          <Typography variant='h6' color='inherit' noWrap>
            <Switch>
              {this.appHeaderRoutes}
            </Switch>
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
          variant='temporary'
          // keep mounted for better open performance on mobile
          ModalProps={{keepMounted: true}}
          className={classNames(classes.drawer, {
            [classes.drawerOpen]: mobileDrawerOpen,
            [classes.drawerClose]: !mobileDrawerOpen,
          })}
          classes={{
            paper: classNames({
              [classes.drawerOpen]: mobileDrawerOpen,
              [classes.drawerClose]: !mobileDrawerOpen,
            }),
          }}
          open={mobileDrawerOpen}
      >
        <div className={classes.toolbar}>
          <IconButton onClick={this.toggleMobileDrawer}>
            {theme.direction === 'rtl' ?
                <ChevronRightIcon/> :
                <ChevronLeftIcon/>}
          </IconButton>
        </div>
        <Divider/>
        {this.renderDrawerMenus(true)}
      </Drawer>
    </React.Fragment>
  }

  renderDrawerMenus(usedMobileDrawer) {
    const {
      classes,
    } = this.props

    const {menuState} = this.state
    return <React.Fragment>
      {this.appRoutes.map((routeSection, routeSectionIdx) => {
        return <React.Fragment key={`${routeSectionIdx}`}>
          <List>
            {routeSection.map((routeGroupOrRoute, routeGroupOrRouteIdx) => {
              if (routeGroupOrRoute.group) {
                return <React.Fragment
                    key={`${routeSectionIdx}${routeGroupOrRouteIdx}`}>
                  <ListItem button onClick={() => this.toggleMenuState(
                      routeSectionIdx, routeGroupOrRouteIdx)}>
                    <ListItemIcon>
                      {routeGroupOrRoute.icon}
                    </ListItemIcon>
                    <ListItemText inset primary={routeGroupOrRoute.text}/>
                    {menuState[`${routeSectionIdx}`][`${routeGroupOrRouteIdx}`] ?
                        <ExpandLess/> :
                        <ExpandMore/>}
                  </ListItem>
                  <Collapse
                      in={menuState[`${routeSectionIdx}`][`${routeGroupOrRouteIdx}`]}
                      timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {routeGroupOrRoute.routes.map((route, routeIdx) => {
                        return <ListItem
                            button
                            className={classes.nested}
                            key={`${routeSectionIdx}${routeGroupOrRouteIdx}${routeIdx}`}
                            onClick={() => this.changePath(route,
                                usedMobileDrawer)}
                        >
                          <ListItemIcon>
                            {route.icon}
                          </ListItemIcon>
                          <ListItemText inset primary={route.text}/>
                        </ListItem>
                      })}
                    </List>
                  </Collapse>
                </React.Fragment>
              } else {
                return <ListItem
                    button
                    key={`${routeSectionIdx}${routeGroupOrRouteIdx}`}
                    onClick={() => this.changePath(routeGroupOrRoute,
                        usedMobileDrawer)}
                >
                  <ListItemIcon>
                    {routeGroupOrRoute.icon}
                  </ListItemIcon>
                  <ListItemText primary={routeGroupOrRoute.text}/>
                </ListItem>
              }
            })}
          </List>
          <Divider/>
        </React.Fragment>
      })}
    </React.Fragment>
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  /**
   * react-router function
   */
  history: PropTypes.object.isRequired,
  /**
   * Logout action creator
   */
  Logout: PropTypes.func.isRequired,
  /**
   * app.doneLoading piece of redux state
   */
  appDoneLoading: PropTypes.bool.isRequired,
  /**
   * Login claims from redux state
   */
  claims: PropTypes.instanceOf(LoginClaims),
  /**
   * AppDoneLoading action creator
   */
  AppDoneLoading: PropTypes.func.isRequired,
  /**
   * SetViewPermissions action creator
   */
  SetViewPermissions: PropTypes.func.isRequired,
}

export default withStyles(styles, {withTheme: true})(App)