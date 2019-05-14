import React from 'react'
import {connect} from 'react-redux'
import App from './NewAPP'
import {
  Logout,
  SetMyParty,
  SetMyUser,
} from 'actions/auth'
import {
  SetViewPermissions,
} from 'actions/permission'
import {
  AppDoneLoading,
  SetMaxViewDimensions,
} from 'actions/app'
import {
  NotificationFailure,
} from 'actions/notification'

let AppContainer = props => {
  return <App {...props}/>
}

const mapStateToProps = (state) => {
  return {
    claims: state.auth.claims,
    appDoneLoading: state.app.doneLoading,
    maxViewDimensions: state.app.maxViewDimensions,
    user: state.auth.user,
    party: state.auth.party,
    viewPermissions: state.permission.view,
  }
}

AppContainer = connect(
    mapStateToProps,
    {
      Logout,
      SetViewPermissions,
      AppDoneLoading,
      SetMyParty,
      SetMyUser,
      SetMaxViewDimensions,
      NotificationFailure,
    }
)(AppContainer)

export default AppContainer