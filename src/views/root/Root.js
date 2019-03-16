import React, {Component} from 'react'
import {BrowserRouter, Route, Switch, Redirect} from 'react-router-dom'
import {withStyles} from '@material-ui/core'
import PropTypes from 'prop-types'
import ToastNotify from '../../components/notification/ToastNotify'
import AppContainer from '../app/AppContainer'
import LoginContainer from '../login/LoginContainer'
import RegisterUserContainer
  from 'views/registrar/registerUser/RegisterUserContainer'
import {parseToken} from 'utilities/token/index'
import {LoginClaims} from 'brain/security/claims/index'
import FullPageLoader from 'components/loader/FullPage'

const styles = theme => ({})

class Root extends Component {
  constructor(props) {
    super(props)
    this.determineLoggedIn = this.determineLoggedIn.bind(this)
    this.logout = this.logout.bind(this)
    this.updateAllowedRoutes = this.updateAllowedRoutes.bind(this)
    this.state = {
      allowedRoutes: [],
    }
    this.loggedIn = this.determineLoggedIn()
  }

  updateAllowedRoutes(newAllowedRoots) {
  }

  determineLoggedIn() {
    const {SetClaims} = this.props
    try {
      const claims = parseToken(sessionStorage.getItem('jwt'))
      if (claims.notExpired && claims.type === LoginClaims.type) {
        SetClaims(claims)
        return true
      } else {
        // if the token is expired clear the token state
        sessionStorage.setItem('jwt', null)
        return false
      }
    } catch (e) {
      sessionStorage.setItem('jwt', null)
      return false
    }
  }

  logout() {
    const {Logout} = this.props
    sessionStorage.removeItem('jwt')
    this.loggedIn = false
    Logout()
  }

  render() {
    const {claims, showGlobalLoader} = this.props

    return (
        <BrowserRouter>
          <div>
            <Switch>
              <Route
                  path='/app'
                  render={props => {
                    // if the app is done loading then we can check if
                    // this route is allowed
                    if (this.loggedIn || claims.notExpired) {
                      return (
                          <AppContainer
                              updateAllowedRoutes={this.updateAllowedRoutes}
                              {...props}
                          />
                      )
                    } else {
                      return <Redirect to='/'/>
                    }
                  }}
              />
              <Route
                  path='/register'
                  render={props => {
                    return <RegisterUserContainer {...props} />
                  }}
              />
              <Route
                  exact
                  path='/logout'
                  render={() => {
                    this.logout()
                    return <Redirect to='/'/>
                  }}
              />
              <Route
                  path='/'
                  render={props => {
                    if (this.loggedIn || claims.notExpired) {
                      return <Redirect to='/app'/>
                    } else {
                      return <LoginContainer {...props} />
                    }
                  }}
              />
            </Switch>
            <ToastNotify/>
            <FullPageLoader open={showGlobalLoader}/>
          </div>
        </BrowserRouter>
    )
  }
}

Root.propTypes = {
  SetClaims: PropTypes.func.isRequired,
  claims: PropTypes.instanceOf(LoginClaims),
  /**
   * redux state flag indicating if the app
   * has loaded
   */
  doneLoading: PropTypes.bool.isRequired,
  /**
   * controls whether the app-wide full
   * page loader is open or not
   */
  showGlobalLoader: PropTypes.bool.isRequired,
}

export default withStyles(styles)(Root)
