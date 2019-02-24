import React from 'react'
import LockIcon from '@material-ui/icons/Lock'
import PeopleIcon from '@material-ui/icons/People'
import PersonIcon from '@material-ui/icons/Person'
import DomainIcon from '@material-ui/icons/Domain'
import HomeIcon from '@material-ui/icons/Home'
import ConfigurationIcon from '@material-ui/icons/Settings'
import DeviceIcon from '@material-ui/icons/DevicesOther'
import DashboardIcon from '@material-ui/icons/Dashboard'
import GPSFixedIcon from '@material-ui/icons/GpsFixed'
import TimelineIcon from '@material-ui/icons/Timeline'
// Home
import SystemHomeContainer from 'views/home/system/SystemContainer'
import CompanyHomeContainer from 'views/home/company/CompanyContainer'
import ClientHomeContainer from 'views/home/client/ClientContainer'
// Configuration
import CompanyContainer from 'views/configuration/company/CompanyContainer'
import ClientContainer from 'views/configuration/client/ClientContainer'
import UserContainer from 'views/configuration/user/UserContainer'
import Device from 'views/configuration/device/Device'
// Dashboards
import LiveTrackingDashboard from 'views/dashboard/tracking/live/Live'
import HistoricalTrackingDashboard from 'views/dashboard/tracking/historical/Historical'

import MapsContainer from 'views/maps/MapsContainer'

// View Permissions
import {
  Configuration, PartyCompanyConfiguration, PartyClientConfiguration,
  PartyUserConfiguration, DeviceConfiguration,
} from 'brain/security/permission/view/permission'
import {
  System,
  Company,
  Client,
} from 'brain/party/types'

const HomeRoute = {
  text: 'Home',
  icon: <HomeIcon/>,
  path: '/app',
}

const homeRouteBuilder = partyType => {
  switch (partyType) {
    case System:
      return {
        text: 'Home',
        icon: <HomeIcon/>,
        path: '/app',
        component: SystemHomeContainer,
      }
    case Company:
      return {
        text: 'Home',
        icon: <HomeIcon/>,
        path: '/app',
        component: CompanyHomeContainer,
      }
    case Client:
      return {
        text: 'Home',
        icon: <HomeIcon/>,
        path: '/app',
        component: ClientHomeContainer,
      }
    default:
      throw new TypeError(
          `invalid party type given to home root builder ${partyType}`)
  }
}

const AppRoutes = [
  // each array in this routes array  is a group which will
  // be separated by a divider

  [
    // each array contains route 'objects' or route 'objectGroup'
    // the difference is that objectGroups contain group: true

    { // this is a route group
      group: true,
      viewPermission: Configuration,
      text: 'Configuration',
      icon: <ConfigurationIcon/>,
      routes: [
        { // this is an individual route
          text: 'Company',
          icon: <DomainIcon/>,
          path: '/app/configuration/company',
          component: CompanyContainer,
          viewPermission: PartyCompanyConfiguration,
        },
        {
          text: 'Client',
          icon: <PeopleIcon/>,
          path: '/app/configuration/client',
          component: ClientContainer,
          viewPermission: PartyClientConfiguration,
        },
        {
          text: 'User',
          icon: <PersonIcon/>,
          path: '/app/configuration/user',
          component: UserContainer,
          viewPermission: PartyUserConfiguration,
        },
        {
          text: 'Device',
          icon: <DeviceIcon/>,
          path: '/app/configuration/device',
          component: Device,
          viewPermission: DeviceConfiguration,
        },
      ],
    },
  ],

  // -------- divider here --------
  [
    { // this is a route group
      group: true,
      // viewPermission: Configuration,
      text: 'Dashboards',
      icon: <DashboardIcon/>,
      routes: [
        {
          text: 'Live Tracking',
          icon: <GPSFixedIcon/>,
          path: '/app/dashboard/liveTracking',
          component: LiveTrackingDashboard,
          // viewPermission: PartyCompanyConfiguration,
        },
        {
          text: 'Historical Tracking',
          icon: <TimelineIcon/>,
          path: '/app/dashboard/historicalTracking',
          component: HistoricalTrackingDashboard,
          // viewPermission: PartyCompanyConfiguration,
        },
      ],
    },
  ],

  [
    {
      text: 'MapsTest',
      icon: <PersonIcon/>,
      path: '/app/maps',
      component: MapsContainer,
    },
  ],
]

const appRouteBuilder = (partyType, viewPermissions) => {
  // initialise app routes with applicable home route
  let appRoutes = [
    [
      homeRouteBuilder(partyType),
      { // this is an individual route
        text: 'Logout',
        icon: <LockIcon/>,
        path: '/logout',
      },
    ],
  ]

  // go through each of the available routes ...
  for (let appRouteSection of AppRoutes) {
    let appRouteSectionArray = []

    for (let appRoute of appRouteSection) {

      // first consider the case of non group routes
      if (!appRoute.group) {
        if (
            // if view permission on this route is undefined
            (appRoute.viewPermission === undefined) ||
            // or if it isn't and this user has the view permission
            viewPermissions.includes(appRoute.viewPermission)
        ) {
          // then add the route
          appRouteSectionArray.push(appRoute)
        }
        continue
      }

      // otherwise the app route is a group
      if (
          // if the group has no assigned view permission
          (appRoute.viewPermission === undefined) ||
          // or if it does and this user has this view permission
          viewPermissions.includes(appRoute.viewPermission)
      ) {
        // then we build the route group
        let routeGroup = {
          group: true,
          viewPermission: appRoute.viewPermission,
          text: appRoute.text,
          icon: appRoute.icon,
          routes: [],
        }
        // and go through all of the routes in the route group ...
        for (let route of appRoute.routes) {
          if (
              // if the route view permission is undefined
              (route.viewPermission === undefined) ||
              // or if it isn't and this user has the view permission
              viewPermissions.includes(route.viewPermission)
          ) {
            // then add the route
            routeGroup.routes.push(route)
          }
        }
        appRouteSectionArray.push(routeGroup)
      }
    }
    if (appRouteSectionArray.length > 0) {
      appRoutes.push(appRouteSectionArray)
    }
  }

  return appRoutes
}

export {
  HomeRoute,
  appRouteBuilder,
}
