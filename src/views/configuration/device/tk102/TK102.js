import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {
  withStyles, Grid, Card, CardContent, CardActions, Typography,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  FormHelperText,
} from '@material-ui/core'
import DeviceIcon from '@material-ui/icons/DevicesOther'
import {
  BEPTable,
} from 'components/table/index'
import {
  TK102 as TK102Entity,
  RecordHandler as TK102RecordHandler,
} from 'brain/tracker/device/tk102/index'
import {RecordHandler as CompanyRecordHandler} from 'brain/party/company'
import {RecordHandler as ClientRecordHandler} from 'brain/party/client'
import {allPartyTypes, Company, Client, System} from 'brain/party/types'
import {FullPageLoader} from 'components/loader/index'
import {ReasonsInvalid} from 'brain/validate/index'
import {Text} from 'brain/search/criterion/types'
import {ListTextCriterion} from 'brain/search/criterion/list'
import {Query} from 'brain/search/index'
import LoginClaims from 'brain/security/auth/claims/LoginClaims'
import SearchDialogTextField
  from 'components/searchDialogTextField/SearchDialogTextfield'
import {IdIdentifier} from 'brain/search/identifier'
import {retrieveFromList} from 'brain/search/identifier/utilities'

const styles = theme => ({
  root: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns: '1fr',
  },
  detailCardWrapper: {
    justifySelf: 'center',
  },
  tableWrapper: {
    overflow: 'auto',
  },
  formField: {
    height: '60px',
    minWidth: '150px',
  },
  progress: {
    margin: 2,
  },
  detailCard: {},
  tk102Icon: {
    fontSize: 100,
    color: theme.palette.primary.main,
  },
})

const states = {
  nop: 0,
  viewingExisting: 1,
  editingNew: 2,
  editingExisting: 3,
}

const events = {
  // init: states.nop,
  init: states.editingNew,

  selectExisting: states.viewingExisting,

  startCreateNew: states.editingNew,
  cancelCreateNew: states.nop,
  createNewSuccess: states.nop,

  startEditExisting: states.editingExisting,
  finishEditExisting: states.nop,
  cancelEditExisting: states.nop,
}

function recordHandlerSelect(partyType) {
  switch (partyType) {
    case Company:
      return CompanyRecordHandler
    case Client:
      return ClientRecordHandler
    default:
  }
}

class TK102 extends Component {

  state = {
    recordCollectionInProgress: false,
    isLoading: false,
    activeState: events.init,
    selected: new TK102Entity(),
    selectedRowIdx: -1,
    records: [],
    totalNoRecords: 0,
  }
  entityMap = {
    Company: [],
    Client: [],
    System: [],
  }
  reasonsInvalid = new ReasonsInvalid()

  collectCriteria = []
  collectQuery = new Query()

  constructor(props) {
    super(props)
    this.renderControls = this.renderControls.bind(this)
    this.renderTK102Details = this.renderTK102Details.bind(this)
    this.handleFieldChange = this.handleFieldChange.bind(this)
    this.handleSaveNew = this.handleSaveNew.bind(this)
    this.handleCriteriaQueryChange = this.handleCriteriaQueryChange.bind(this)
    this.collect = this.collect.bind(this)
    this.handleSelect = this.handleSelect.bind(this)
    this.handleCreateNew = this.handleCreateNew.bind(this)
    this.handleCancelCreateNew = this.handleCancelCreateNew.bind(this)
    this.handleSaveChanges = this.handleSaveChanges.bind(this)
    this.handleStartEditExisting = this.handleStartEditExisting.bind(this)
    this.handleCancelEditExisting = this.handleCancelEditExisting.bind(this)
    this.collectTimeout = () => {
    }
  }

  componentDidMount() {
    this.collect()
  }

  handleCreateNew() {
    const {
      claims,
    } = this.props
    let newTK102Entity = new TK102Entity()
    newTK102Entity.parentId = claims.partyId
    newTK102Entity.ownerPartyType = claims.partyType
    newTK102Entity.ownerId = claims.partyId
    newTK102Entity.assignedPartyType = claims.partyType
    newTK102Entity.assignedId = claims.partyId

    this.setState({
      selectedRowIdx: -1,
      activeState: events.startCreateNew,
      selected: newTK102Entity,
    })
  }

  handleFieldChange(event) {
    let {
      selected,
    } = this.state
    const fieldName = event.target.name ? event.target.name : event.target.id

    switch (fieldName) {
      case 'ownerId':
        selected[fieldName] = new IdIdentifier(event.target.value.id)
        break
      case 'ownerPartyType':
        // if owner party type changed clear owner id
        selected['ownerId'] = new IdIdentifier()
        selected[fieldName] = event.target.value
        break

      case 'assignedPartyType':
        // if assigned party type changed clear assigned id
        selected['assignedId'] = new IdIdentifier()
        selected[fieldName] = event.target.value
        break

      default:
        selected[fieldName] = event.target.value
    }
    if (fieldName === 'ownerId') {
      console.log('event', event)
    }

    this.reasonsInvalid.clearField(fieldName)
    this.setState({selected})
  }

  async handleSaveNew() {
    const {
      selected,
    } = this.state
    const {
      NotificationSuccess,
      NotificationFailure,
    } = this.props

    this.setState({isLoading: true})

    // perform validation
    try {
      const reasonsInvalid = await selected.validate('Create')
      if (reasonsInvalid.count > 0) {
        this.reasonsInvalid = reasonsInvalid
        this.setState({isLoading: false})
        return
      }
    } catch (e) {
      console.error('Error Validating TK102', e)
      NotificationFailure('Error Validating TK102')
      this.setState({isLoading: false})
      return
    }

    // if validation passes, perform create
    try {
      await selected.create()
      NotificationSuccess('Successfully Created TK102')
      this.setState({activeState: events.createNewSuccess})
      await this.collect()
      this.setState({isLoading: false})
    } catch (e) {
      console.error('Error Creating TK102', e)
      NotificationFailure('Error Creating TK102')
      this.setState({isLoading: false})
    }
  }

  handleCancelCreateNew() {
    this.reasonsInvalid.clearAll()
    this.setState({activeState: events.cancelCreateNew})
  }

  handleSaveChanges() {
    this.setState({activeState: events.finishEditExisting})
  }

  handleStartEditExisting() {
    this.setState({
      activeState: events.startEditExisting,
    })
  }

  handleCancelEditExisting() {
    this.setState({activeState: events.finishEditExisting})
  }

  async collect() {
    const {
      NotificationFailure,
    } = this.props

    this.setState({recordCollectionInProgress: true})
    // fetch tk102 records
    let response
    try {
      response =
          await TK102RecordHandler.Collect(
              this.collectCriteria,
              this.collectQuery,
          )
    } catch (e) {
      console.error('error collecting tk102 records', e)
      NotificationFailure('Failed To Fetch TK102 Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // compile list criteria for retrieval of client and company
    // entities associated with these TK102 devices
    let systemEntityIds = []
    let clientEntityIds = []
    let companyEntityIds = []
    response.records.forEach(record => {
      switch (record.ownerPartyType) {
        case System:
          if (!systemEntityIds.includes(record.ownerId.id)) {
            systemEntityIds.push(record.ownerId.id)
          }
          break
        case Company:
          if (!companyEntityIds.includes(record.ownerId.id)) {
            companyEntityIds.push(record.ownerId.id)
          }
          break
        case Client:
          if (!clientEntityIds.includes(record.ownerId.id)) {
            clientEntityIds.push(record.ownerId.id)
          }
          break
        default:
      }

      switch (record.assignedPartyType) {
        case System:
          if (!systemEntityIds.includes(record.assignedId.id)) {
            systemEntityIds.push(record.assignedId.id)
          }
          break
        case Company:
          if (!companyEntityIds.includes(record.assignedId.id)) {
            companyEntityIds.push(record.assignedId.id)
          }
          break
        case Client:
          if (!clientEntityIds.includes(record.assignedId.id)) {
            clientEntityIds.push(record.assignedId.id)
          }
          break
        default:
      }
    })

    // fetch company entities
    try {
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
    } catch (e) {
      this.entityMap.Company = []
      console.error('error collecting company records', e)
      NotificationFailure('Failed To Fetch Company Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    // fetch client entities
    try {
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
    } catch (e) {
      this.entityMap.Client = []
      console.error('error collecting client records', e)
      NotificationFailure('Failed To Fetch Client Records')
      this.setState({recordCollectionInProgress: false})
      return
    }

    this.setState({
      recordCollectionInProgress: false,
      records: response.records,
      totalNoRecords: response.total,
    })
  }

  handleCriteriaQueryChange(criteria, query) {
    this.collectCriteria = criteria
    this.collectQuery = query
    this.collectTimeout = setTimeout(this.collect, 300)
    this.setState({
      activeState: events.init,
      selected: new TK102Entity(),
      selectedRowIdx: -1,
    })
  }

  handleSelect(rowRecordObj, rowIdx) {
    this.reasonsInvalid.clearAll()
    this.setState({
      selectedRowIdx: rowIdx,
      selected: new TK102Entity(rowRecordObj),
      activeState: events.selectExisting,
    })
  }

  render() {
    const {
      isLoading,
      recordCollectionInProgress,
      selectedRowIdx,
      records,
      totalNoRecords,
    } = this.state
    const {
      theme,
      classes,
    } = this.props

    return <div className={classes.root} style={{gridRowGap: 8}}>
      <div className={classes.detailCardWrapper}>
        <Grid container>
          <Grid item>
            <Card className={classes.detailCard}>
              <CardContent>
                {this.renderTK102Details()}
              </CardContent>
              {this.renderControls()}
            </Card>
          </Grid>
        </Grid>
      </div>
      <div className={classes.tableWrapper}>
        <Card>
          <CardContent>
            <BEPTable
                loading={recordCollectionInProgress}
                totalNoRecords={totalNoRecords}
                noDataText={'No TK102 Devices Found'}
                data={records}
                onCriteriaQueryChange={this.handleCriteriaQueryChange}

                columns={[
                  {
                    Header: 'Owner Party Type',
                    accessor: 'ownerPartyType',
                    width: 136,
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'Owned By',
                    accessor: 'ownerId',
                    width: 150,
                    Cell: rowCellInfo => {
                      try {
                        const list = this.entityMap[rowCellInfo.original.ownerPartyType]
                        const entity = retrieveFromList(
                            rowCellInfo.value,
                            list ? list : [],
                        )
                        return entity ? entity.name : ''
                      } catch (e) {
                        console.error('error getting owner info', e)
                        return '-'
                      }
                    },
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'Assigned Party Type',
                    accessor: 'assignedPartyType',
                    width: 160,
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'Assigned To',
                    accessor: 'assignedId.id',
                    width: 150,
                    Cell: rowCellInfo => {
                      try {
                        const list = this.entityMap[rowCellInfo.original.assignedPartyType]
                        const entity = retrieveFromList(
                            rowCellInfo.value,
                            list ? list : [],
                        )
                        return entity ? entity.name : ''
                      } catch (e) {
                        console.error('error getting assigned info', e)
                        return '-'
                      }
                    },
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'Sim Country Code',
                    accessor: 'simCountryCode',
                    width: 150,
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'Sim Number',
                    accessor: 'simNumber',
                    width: 150,
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                  {
                    Header: 'IMEI',
                    accessor: 'imei',
                    width: 150,
                    config: {
                      filter: {
                        type: Text,
                      },
                    },
                  },
                ]}

                getTdProps={(state, rowInfo) => {
                  const rowIndex = rowInfo ? rowInfo.index : undefined
                  return {
                    onClick: (e, handleOriginal) => {
                      if (rowInfo) {
                        this.handleSelect(rowInfo.original, rowInfo.index)
                      }
                      if (handleOriginal) {
                        handleOriginal()
                      }
                    },
                    style: {
                      background: rowIndex === selectedRowIdx ?
                          theme.palette.secondary.light :
                          'white',
                      color: rowIndex === selectedRowIdx ?
                          theme.palette.secondary.contrastText :
                          theme.palette.primary.main,
                    },
                  }
                }}
            />
          </CardContent>
        </Card>
      </div>
      <FullPageLoader open={isLoading}/>
    </div>
  }

  renderTK102Details() {
    const {
      isLoading,
      activeState,
    } = this.state
    const {
      classes,
    } = this.props

    const fieldValidations = this.reasonsInvalid.toMap()
    const helperText = field => fieldValidations[field]
        ? fieldValidations[field].help
        : undefined
    const disableFields = (activeState === states.viewingExisting) ||
        isLoading

    switch (activeState) {

      case states.nop:
        return <Grid
            container
            direction='column'
            spacing={8}
            alignItems={'center'}
        >
          <Grid item>
            <Typography
                variant={'body1'}
                align={'center'}
                color={'primary'}
            >
              Select A TK102 to View or Edit
            </Typography>
          </Grid>
          <Grid item>
            <DeviceIcon className={classes.tk102Icon}/>
          </Grid>
          <Grid item>
            <Button
                size='small'
                color='primary'
                variant='contained'
                onClick={this.handleCreateNew}
            >
              Create New
            </Button>
          </Grid>
        </Grid>

      case states.viewingExisting:
      case states.editingNew:
      case states.editingExisting:
        const {
          selected,
        } = this.state
        return <Grid
            container
            direction='column'
            spacing={8}
            alignItems='center'
        >
          <Grid item>
            <Typography
                variant='body1'
                align='center'
                color='primary'
            >
              {(() => {
                switch (activeState) {
                  case states.editingNew:
                    return 'Creating New'
                  case states.editingExisting:
                    return 'Editing'
                  case states.viewingExisting:
                    return 'Details'
                  default:
                }
              })()}
            </Typography>
          </Grid>
          <Grid item>
            <Grid container direction='row' spacing={8}>
              <Grid item>
                <Grid container direction='column' spacing={8}>
                  <Grid item>
                    <FormControl
                        className={classes.formField}
                        error={!!fieldValidations.ownerPartyType}
                        aria-describedby='ownerPartyType'
                    >
                      <InputLabel htmlFor='ownerPartyType'>
                        Owner Party Type
                      </InputLabel>
                      <Select
                          id='ownerPartyType'
                          name='ownerPartyType'
                          value={selected.ownerPartyType}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          style={{width: 150}}
                      >
                        <MenuItem value=''><em>None</em></MenuItem>
                        {allPartyTypes.map((partyType, idx) => {
                          return <MenuItem
                              key={idx}
                              value={partyType}
                          >
                            {partyType}
                          </MenuItem>
                        })}
                      </Select>
                      {(!!fieldValidations.ownerPartyType) &&
                      <FormHelperText id='ownerPartyType'>
                        {helperText('ownerPartyType')}
                      </FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item>
                    <FormControl
                        className={classes.formField}
                        error={!!fieldValidations.assignedPartyType}
                        aria-describedby='assignedPartyType'
                    >
                      <InputLabel htmlFor='assignedPartyType'>
                        Assigned Party Type
                      </InputLabel>
                      <Select
                          id='assignedPartyType'
                          name='assignedPartyType'
                          value={selected.assignedPartyType}
                          onChange={this.handleFieldChange}
                          disabled={disableFields}
                          style={{width: 165}}
                      >
                        <MenuItem value=''><em>None</em></MenuItem>
                        {allPartyTypes.map((partyType, idx) => {
                          return <MenuItem
                              key={idx}
                              value={partyType}
                          >
                            {partyType}
                          </MenuItem>
                        })}
                      </Select>
                      {(!!fieldValidations.assignedPartyType) &&
                      <FormHelperText id='assignedPartyType'>
                        {helperText('assignedPartyType')}
                      </FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item>
                    <TextField
                        className={classes.formField}
                        id='simCountryCode'
                        label='Sim Country Code'
                        value={selected.simCountryCode}
                        onChange={this.handleFieldChange}
                        disabled={disableFields}
                        helperText={helperText('simCountryCode')}
                        error={!!fieldValidations.simCountryCode}
                    />
                  </Grid>
                  <Grid item>
                    <TextField
                        className={classes.formField}
                        id='imei'
                        label='imei'
                        value={selected.imei}
                        onChange={this.handleFieldChange}
                        disabled={disableFields}
                        helperText={helperText('imei')}
                        error={!!fieldValidations.imei}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item>
                <Grid container direction='column' spacing={8}>
                  <Grid item>
                    <SearchDialogTextField
                        className={classes.formField}
                        id='ownerId'
                        label='Owned By'
                        value={selected.ownerId.id}
                        onChange={this.handleFieldChange}
                        disabled={disableFields}
                        helperText={helperText('ownerId')}
                        error={!!fieldValidations.ownerId}
                        recordHandler={recordHandlerSelect(
                            selected.ownerPartyType)}
                        undefinedMessage={'Please First Select Owner Party Type'}
                        searchColumns={[
                          {
                            Header: 'Name',
                            accessor: 'name',
                            config: {
                              filter: {
                                type: Text,
                              },
                            },
                          },
                        ]}
                    />
                  </Grid>
                  <Grid item>
                    <SearchDialogTextField
                        className={classes.formField}
                        id='assignedId'
                        label='Assigned To'
                        value={selected.assignedId.id}
                        onChange={this.handleFieldChange}
                        disabled={disableFields}
                        helperText={helperText('assignedId')}
                        error={!!fieldValidations.assignedId}
                        recordHandler={recordHandlerSelect(
                            selected.assignedPartyType)}
                        undefinedMessage={'Please First Select Owner Party Type'}
                        searchColumns={[
                          {
                            Header: 'Name',
                            accessor: 'name',
                            config: {
                              filter: {
                                type: Text,
                              },
                            },
                          },
                        ]}
                    />
                  </Grid>
                  <Grid item>
                    <TextField
                        className={classes.formField}
                        id='simNumber'
                        label='Sim Number'
                        value={selected.simNumber}
                        onChange={this.handleFieldChange}
                        disabled={disableFields}
                        helperText={helperText('simNumber')}
                        error={!!fieldValidations.simNumber}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

      default:
    }

  }

  renderControls() {
    const {
      activeState,
    } = this.state

    switch (activeState) {

      case states.viewingExisting:
        return <CardActions>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleStartEditExisting}
          >
            Edit
          </Button>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleCreateNew}
          >
            Create New
          </Button>
        </CardActions>

      case states.editingNew:
        return <CardActions>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleSaveNew}
          >
            Save New
          </Button>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleCancelCreateNew}
          >
            Cancel
          </Button>
        </CardActions>

      case states.editingExisting:
        return <CardActions>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleSaveChanges}
          >
            Save Changes
          </Button>
          <Button
              size='small'
              color='primary'
              variant='contained'
              onClick={this.handleCancelEditExisting}
          >
            Cancel
          </Button>
        </CardActions>

      case states.nop:
      default:
    }
  }
}

TK102 = withStyles(styles, {withTheme: true})(TK102)

TK102.propTypes = {
  /**
   * Success Action Creator
   */
  NotificationSuccess: PropTypes.func.isRequired,
  /**
   * Failure Action Creator
   */
  NotificationFailure: PropTypes.func.isRequired,
  /**
   * Login claims from redux state
   */
  claims: PropTypes.instanceOf(LoginClaims),
}

TK102.defaultProps = {}

export default TK102