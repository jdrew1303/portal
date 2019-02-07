import React, {Component} from 'react'
import {connect} from 'react-redux'
import Root from './Root'
import {MuiThemeProvider} from '@material-ui/core'
import {
  themeOptions, getTheme,
} from 'theme/options'
import {
  SetClaims,
} from 'actions/auth'

class RootContainer extends Component {

  state = {
    chosenThemeOption: themeOptions.default,
  }

  theme = getTheme(this.state.chosenThemeOption)

  render () {
    const {
      SetClaims,
      claims,
    } = this.props
    return <MuiThemeProvider theme={this.theme}>
      <Root
          SetClaims={SetClaims}
          claims={claims}
      />
    </MuiThemeProvider>
  }
}

function mapStateToProps(state) {
  return {
    claims: state.auth.claims,
  }
}

export default connect(
    mapStateToProps,
    {
      SetClaims,
    },
)(RootContainer)