import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {
  withStyles,
  Typography,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  Grid,
  Card,
  Collapse,
  IconButton,
  Tooltip, CardContent,
  CardHeader, Avatar,
} from '@material-ui/core'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import ExpandLessIcon from '@material-ui/icons/ExpandLess'
// import MultiSelect from 'components/multiSelect'
// import {CompanyRecordHandler} from 'brain/party/company'
// import {ClientRecordHandler} from 'brain/party/client'
// import {TrackingReport} from 'brain/report/tracking'
import MapGL, {
  Marker,
  // Popup,
  // NavigationControl,
} from 'react-map-gl'
import 'components/mapbox/Custom.css'
import {MapPin, MapPinPopup} from './map'
import ZX303TrackerGPSReading from 'brain/tracker/zx303/reading/gps'
// import {SystemRecordHandler} from 'brain/party/system'
// import {PartyIdentifier} from 'brain/search/identifier'
import {
  // ClientPartyType,
  // CompanyPartyType,
  // SystemPartyType,
  allPartyTypes, ClientPartyType, CompanyPartyType, SystemPartyType,
} from 'brain/party/types'
import {HumanUserLoginClaims} from 'brain/security/claims'
import {retrieveFromList} from 'brain/search/identifier/utilities'
import BEPTable from 'components/table/bepTable/BEPTable'
import {
  TextCriterionType, ExactTextCriterionType, ListTextCriterionType,
} from 'brain/search/criterion/types'
import Query from 'brain/search/Query'
import {RecordHandler as TK102RecordHandler} from 'brain/tracker/tk102/index'
import SystemRecordHandler from 'brain/party/system/RecordHandler'
import ListTextCriterion from 'brain/search/criterion/list/Text'
import CompanyRecordHandler from 'brain/party/company/RecordHandler'
import ClientRecordHandler from 'brain/party/client/RecordHandler'

const TOKEN =
    'pk.eyJ1IjoiaW1yYW5wYXJ1ayIsImEiOiJjanJ5eTRqNzEwem1iM3lwazhmN3R1NWU4In0.FdWdZYUaovv2FY5QcQWVHg'
const partyTypeOptions = allPartyTypes.map(partyType =>
    ({value: partyType, display: partyType}),
)

const styles = theme => ({
  root: {
    height: '100%',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns: '1fr',
    justifyItems: 'center',
  },
  expanderRoot: {},
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  panelInfo: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
  },
  map: {
    padding: 10,
  },
  partySwitchWrapper: {
    margin: 2,
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gridTemplateColumns: 'auto auto',
    alignItems: 'center',
  },
  button: {
    margin: theme.spacing(1),
  },
})

/**
 * returns a random color
 * @param {string[]} [exclude] - colors to exclude
 * @returns {string}
 */
// function getRandomColor(exclude = []) {
//   const letters = '0123456789ABCDEF'
//   let color = '#'
//   let firstTime = true
//   while (exclude.includes(color) || firstTime) {
//     firstTime = false
//     color = '#'
//     for (let i = 0; i < 6; i++) {
//       color += letters[Math.floor(Math.random() * 16)]
//     }
//   }
//
//   return color
// }

const filterPanels = {
  device: 0,
}

class Historical extends Component {
  constructor(props) {
    super(props)
    this.getPartyName = this.getPartyName.bind(this)
    this.loadReport = this.loadReport.bind(this)
    this.renderFilterShowHideIcon = this.renderFilterShowHideIcon.bind(this)
    this.renderControls = this.renderControls.bind(this)
    this.load = this.load.bind(this)
    this.updateMapViewport = this.updateMapViewport.bind(this)
    this.renderMapPins = this.renderMapPins.bind(this)
    this.getMapHeight = this.getMapHeight.bind(this)
    this.renderMapPinPopup = this.renderMapPinPopup.bind(this)
    this.handleTK102DeviceCriteriaQueryChange =
        this.handleTK102DeviceCriteriaQueryChange.bind(this)
    this.collectTK102Devices = this.collectTK102Devices.bind(this)
    this.renderTK102DevicesAvailableTable =
        this.renderTK102DevicesAvailableTable.bind(this)
    this.state = {
      // expanded: null,
      expanded: filterPanels.device,
      // showControls: false,
      showControls: true,
      viewport: {
        latitude: -26.046573,
        longitude: 28.095451,
        zoom: 5,
        bearing: 0,
        pitch: 0,
      },
      mapHeight: 0,
      popupInfo: null,
      readings: [],

      mapPopUpOpen: false,
      selectedReading: new ZX303TrackerGPSReading(),

      hideUnassignedDevices: true,

      // showAvailableDevicesTable: false,
      showAvailableDevicesTable: true,
      showSelectedDevicesTable: false,

      tk102DeviceRecords: {
        records: [],
        total: 0,
        loading: false,
      },
    }

    this.tk102DeviceCriteria = []
    this.tk102DeviceQuery = new Query()
    this.collectTK102DevicesTimeout = () => {
    }

    this.entityMap = {
      Company: [],
      Client: [],
      System: [],
    }

    this.readingPinColorMap = {}

    this.loadReportTimeout = () => {
    }
  }

  getPartyName(partyType, partyId) {
    const list = this.entityMap[partyType]
    const entity = retrieveFromList(partyId, list ? list : [])
    return entity ? entity.name : ''
  }

  async load() {
    const {ShowGlobalLoader, HideGlobalLoader} = this.props
    ShowGlobalLoader()
    try {
      await this.collectTK102Devices()
    } catch (e) {
      console.error('error loading historical tracking dashboard', e)
    }
    HideGlobalLoader()
  }

  componentDidMount() {
    // this.load().then(() => this.loadReport())
    this.load()
  }

  handleChange = panel => (event, expanded) => {
    this.setState({
      expanded: expanded ? panel : false,
    })
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const {expanded: prevExpanded} = prevState
    const {expanded} = this.state
    if (expanded !== prevExpanded && expanded !== null) {
    }
  }

  async loadReport() {
    const {ShowGlobalLoader, HideGlobalLoader} = this.props
    ShowGlobalLoader()
    try {

    } catch (e) {
      console.error('error loading report', e)
    }
    HideGlobalLoader()
  }

  // TK102 Device Methods
  async collectTK102Devices() {
    const {NotificationFailure} = this.props
    const {tk102DeviceRecords} = this.state
    this.setState({
      tk102DeviceRecords: {
        ...tk102DeviceRecords,
        loading: true,
      },
    })

    // fetch tk102 records
    let response
    try {
      response = await TK102RecordHandler.Collect(
          this.tk102DeviceCriteria,
          this.tk102DeviceQuery,
      )
    } catch (e) {
      console.error('error collecting device records', e)
      NotificationFailure('Failed To Fetch TK102 Devices')
      this.setState({
        tk102DeviceRecords: {
          ...tk102DeviceRecords,
          loading: false,
        },
      })
    }

    // compile list criteria for retrieval of client and company
    // entities associated with these TK102 devices
    let systemEntityIds = []
    let clientEntityIds = []
    let companyEntityIds = []
    response.records.forEach(record => {
      switch (record.ownerPartyType) {
        case SystemPartyType:
          if (!systemEntityIds.includes(record.ownerId.id)) {
            systemEntityIds.push(record.ownerId.id)
          }
          break
        case CompanyPartyType:
          if (!companyEntityIds.includes(record.ownerId.id)) {
            companyEntityIds.push(record.ownerId.id)
          }
          break
        case ClientPartyType:
          if (!clientEntityIds.includes(record.ownerId.id)) {
            clientEntityIds.push(record.ownerId.id)
          }
          break
        default:
      }

      switch (record.assignedPartyType) {
        case SystemPartyType:
          if (!systemEntityIds.includes(record.assignedId.id)) {
            systemEntityIds.push(record.assignedId.id)
          }
          break
        case CompanyPartyType:
          if (!companyEntityIds.includes(record.assignedId.id)) {
            companyEntityIds.push(record.assignedId.id)
          }
          break
        case ClientPartyType:
          if (!clientEntityIds.includes(record.assignedId.id)) {
            clientEntityIds.push(record.assignedId.id)
          }
          break
        default:
      }
    })

    // fetch system entities
    try {
      if (systemEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.System = (await SystemRecordHandler.Collect(
            [
              new ListTextCriterion({
                field: 'id',
                list: systemEntityIds,
              }),
            ],
            blankQuery,
        )).records
      }
    } catch (e) {
      this.entityMap.System = []
      console.error('error collecting system records', e)
      NotificationFailure('Failed To Fetch System Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // fetch company entities
    try {
      if (companyEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.Company = (await CompanyRecordHandler.Collect(
            [
              new ListTextCriterion({
                field: 'id',
                list: companyEntityIds,
              }),
            ],
            blankQuery,
        )).records
      }
    } catch (e) {
      this.entityMap.Company = []
      console.error('error collecting company records', e)
      NotificationFailure('Failed To Fetch Company Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // fetch client entities
    try {
      if (clientEntityIds.length > 0) {
        const blankQuery = new Query()
        blankQuery.limit = 0
        this.entityMap.Client = (await ClientRecordHandler.Collect(
            [
              new ListTextCriterion({
                field: 'id',
                list: clientEntityIds,
              }),
            ],
            blankQuery,
        )).records
      }
    } catch (e) {
      this.entityMap.Client = []
      console.error('error collecting client records', e)
      NotificationFailure('Failed To Fetch Client Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    this.setState({
      tk102DeviceRecords: {
        records: response.records,
        total: response.total,
        loading: false,
      },
    })
  }

  handleTK102DeviceCriteriaQueryChange(criteria, query) {
    this.tk102DeviceCriteria = criteria
    this.tk102DeviceQuery = query
    this.collectTK102DevicesTimeout = setTimeout(this.collectTK102Devices, 300)
  }

  renderTK102DevicesAvailableTable() {
    const {tk102DeviceRecords} = this.state

    return (
        <BEPTable
            loading={tk102DeviceRecords.loading}
            totalNoRecords={tk102DeviceRecords.total}
            noDataText={'No TK102 Devices Found'}
            data={tk102DeviceRecords.records}
            onCriteriaQueryChange={this.handleTK102DeviceCriteriaQueryChange}

            columns={[
              {
                Header: 'Owner Party Type',
                accessor: 'ownerPartyType',
                width: 136,
                config: {
                  filter: {
                    type: TextCriterionType,
                  },
                },
              },
              {
                Header: 'Owned By',
                accessor: 'ownerId',
                width: 150,
                Cell: rowCellInfo => {
                  try {
                    return this.getPartyName(
                        rowCellInfo.original.ownerPartyType,
                        rowCellInfo.value,
                    )
                  } catch (e) {
                    console.error('error getting owner info', e)
                    return '-'
                  }
                },
                config: {
                  filter: {
                    type: TextCriterionType,
                  },
                },
              },
              {
                Header: 'Assigned Party Type',
                accessor: 'assignedPartyType',
                width: 160,
                config: {
                  filter: {
                    type: ExactTextCriterionType,
                    options: partyTypeOptions,
                    valueAccessor: 'value',
                    displayAccessor: 'display',
                  },
                },
              },
              {
                Header: 'Assigned To',
                accessor: 'assignedId',
                width: 150,
                Cell: rowCellInfo => {
                  try {
                    return this.getPartyName(
                        rowCellInfo.original.assignedPartyType,
                        rowCellInfo.value,
                    )
                  } catch (e) {
                    console.error('error getting assigned info',
                        e)
                    return '-'
                  }
                },
                config: {
                  filter: {
                    type: ListTextCriterionType,
                  },
                },
              },
              {
                Header: 'Sim Country Code',
                accessor: 'simCountryCode',
                width: 150,
                config: {
                  filter: {
                    type: TextCriterionType,
                  },
                },
              },
              {
                Header: 'Sim Number',
                accessor: 'simNumber',
                width: 150,
                config: {
                  filter: {
                    type: TextCriterionType,
                  },
                },
              },
              {
                Header: 'Manufacturer Id',
                accessor: 'manufacturerId',
                width: 150,
                config: {
                  filter: {
                    type: TextCriterionType,
                  },
                },
              },
            ]}
        />
    )
  }

  renderControls() {
    const {classes} = this.props
    const {
      expanded,
      showAvailableDevicesTable,
      showSelectedDevicesTable,
    } = this.state

    return (
        <div className={classes.expanderRoot}>
          <ExpansionPanel
              expanded={expanded === filterPanels.device}
              onChange={this.handleChange(filterPanels.device)}
          >
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon/>}>
              <div className={classes.panelInfo}>
                <Typography className={classes.heading}>
                  Device Filter
                </Typography>
                <Typography className={classes.secondaryHeading}>
                  Select The Devices You'd Like Displayed
                </Typography>
              </div>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails>
              <Grid
                  container
                  direction="column"
                  spacing={1}
                  alignItems="center"
              >
                <Grid item>
                  <Card>
                    <CardHeader
                        avatar={
                          <Avatar aria-label='available'
                                  className={classes.avatar}>
                            R
                          </Avatar>
                        }
                        action={
                          <IconButton
                              onClick={() => this.setState({
                                showSelectedDevicesTable:
                                    !showSelectedDevicesTable,
                              })}
                          >
                            {showSelectedDevicesTable
                                ? <ExpandLessIcon/>
                                : <ExpandMoreIcon/>
                            }
                          </IconButton>
                        }
                        title='Selected'
                        subheader='Devices You Have Selected'
                    />
                    <Collapse in={showSelectedDevicesTable}>
                      <CardContent>
                        <BEPTable
                            loading={false}
                            totalNoRecords={5}
                            noDataText={'No Clients Found'}
                            data={[{}]}
                            onCriteriaQueryChange={() => {
                            }}

                            columns={[
                              {
                                Header: 'Owner Party Type',
                                accessor: 'ownerPartyType',
                                width: 136,
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Owned By',
                                accessor: 'ownerId',
                                width: 150,
                                Cell: rowCellInfo => {
                                  try {
                                    return this.getPartyName(
                                        rowCellInfo.original.ownerPartyType,
                                        rowCellInfo.value,
                                    )
                                  } catch (e) {
                                    console.error('error getting owner info', e)
                                    return '-'
                                  }
                                },
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Assigned Party Type',
                                accessor: 'assignedPartyType',
                                width: 160,
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Assigned To',
                                accessor: 'assignedId',
                                width: 150,
                                Cell: rowCellInfo => {
                                  try {
                                    return this.getPartyName(
                                        rowCellInfo.original.assignedPartyType,
                                        rowCellInfo.value,
                                    )
                                  } catch (e) {
                                    console.error('error getting assigned info',
                                        e)
                                    return '-'
                                  }
                                },
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Sim Country Code',
                                accessor: 'simCountryCode',
                                width: 150,
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Sim Number',
                                accessor: 'simNumber',
                                width: 150,
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                              {
                                Header: 'Manufacturer Id',
                                accessor: 'manufacturerId',
                                width: 150,
                                config: {
                                  filter: {
                                    type: TextCriterionType,
                                  },
                                },
                              },
                            ]}
                        />
                      </CardContent>
                    </Collapse>
                  </Card>
                </Grid>
                <Grid item>
                  <Card>
                    <CardHeader
                        avatar={
                          <Avatar aria-label='available'
                                  className={classes.avatar}>
                            R
                          </Avatar>
                        }
                        action={
                          <IconButton
                              onClick={() => this.setState({
                                showAvailableDevicesTable:
                                    !showAvailableDevicesTable,
                              })}
                          >
                            {showAvailableDevicesTable
                                ? <ExpandLessIcon/>
                                : <ExpandMoreIcon/>
                            }
                          </IconButton>
                        }
                        title='Available'
                        subheader='Devices That You Can Select'
                    />
                    <Collapse in={showAvailableDevicesTable}>
                      <CardContent>
                        {this.renderTK102DevicesAvailableTable()}
                      </CardContent>
                    </Collapse>
                  </Card>
                </Grid>
              </Grid>
            </ExpansionPanelDetails>
          </ExpansionPanel>
        </div>
    )
  }

  updateMapViewport = viewport => {
    this.setState({viewport})
  }

  getMapHeight(element) {
    try {
      if (element) {
        this.setState({mapHeight: element.clientHeight - 10})
      }
    } catch (e) {
      console.error('error getting map dimensions', e)
    }
  }

  renderMapPins() {
    const {readings} = this.state

    return readings.map((reading, idx) => {
      return (
          <Marker
              key={`marker-${idx}`}
              longitude={reading.longitude}
              latitude={reading.latitude}
          >
            <MapPin
                style={{
                  ...MapPin.defaultProps.style,
                  fill: this.readingPinColorMap[reading.id],
                }}
                onClick={() => this.setState({
                  selectedReading: reading,
                  mapPopUpOpen: true,
                })}
            />
          </Marker>
      )
    })
  }

  renderMapPinPopup() {
    const {selectedReading, mapPopUpOpen} = this.state

    return (
        <MapPinPopup
            open={mapPopUpOpen}
            tipSize={5}
            anchor="top"
            getPartyName={this.getPartyName}
            reading={selectedReading}
            longitude={selectedReading.longitude}
            latitude={selectedReading.latitude}
            closeOnClick={false}
            onClose={() => this.setState({
              mapPopUpOpen: false,
            })}
        />
    )
  }

  renderFilterShowHideIcon() {
    const {classes} = this.props
    const {showControls} = this.state
    if (showControls) {
      return (
          <Tooltip
              title='Hide Filters'
              placement={'right'}
          >
            <IconButton
                onClick={() => this.setState({showControls: !showControls})}
                className={classes.button} aria-label='collapse'
            >
              <ExpandLessIcon/>
            </IconButton>
          </Tooltip>
      )
    } else {
      return (
          <Tooltip
              title='Show Filters'
              placement={'right'}
          >
            <IconButton
                onClick={() => this.setState({showControls: !showControls})}
                className={classes.button} aria-label='expand'
            >
              <ExpandMoreIcon/>
            </IconButton>
          </Tooltip>
      )
    }
  }

  render() {
    const {classes} = this.props
    const {viewport, mapHeight, showControls} = this.state

    return (
        <div
            id={'liveTrackingDashboardRoot'}
            className={classes.root}
        >
          <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
          >
            <Card>
              <Grid container direction={'column'} alignItems={'center'}>
                <Grid item>
                  {this.renderFilterShowHideIcon()}
                </Grid>
                <Grid item>
                  <Collapse in={showControls}>
                    {this.renderControls()}
                  </Collapse>
                </Grid>
              </Grid>
            </Card>
          </div>
          <div className={classes.map} ref={this.getMapHeight}>
            <MapGL
                {...viewport}
                height={mapHeight}
                mapStyle="mapbox://styles/mapbox/dark-v9"
                onViewportChange={this.updateMapViewport}
                mapboxApiAccessToken={TOKEN}
            >
              {this.renderMapPins()}
              {this.renderMapPinPopup()}
            </MapGL>
          </div>
        </div>
    )
  }
}

Historical = withStyles(styles)(Historical)

Historical.propTypes = {
  /**
   * Show Global Loader Action Creator
   */
  ShowGlobalLoader: PropTypes.func.isRequired,
  /**
   * Hide Global Loader Action Creator
   */
  HideGlobalLoader: PropTypes.func.isRequired,
  /**
   * HumanUserLoginClaims claims from redux state
   */
  claims: PropTypes.instanceOf(HumanUserLoginClaims),
  /**
   * my party entity
   */
  party: PropTypes.object.isRequired,
  /**
   * Failure Action Creator
   */
  NotificationFailure: PropTypes.func.isRequired,
}
Historical.defaultProps = {}

export default Historical
