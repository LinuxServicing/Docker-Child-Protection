import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { Box, useMediaQuery } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { fromJS } from "immutable";
import { withRouter } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { push } from "connected-react-router";

import { IndexTable } from "./../index-table";
import { Filters } from "../filters";
import { RecordSearch } from "./../record-search";
import { PageContainer } from "./../page";
import { useI18n } from "./../i18n";
import { selectFiltersByRecordType } from "./../filters-builder";
import { getPermissionsByRecord } from "./../user";
import { PERMISSION_CONSTANTS, checkPermissions } from "./../../libs/permissions";
import Permission from "./../application/permission";
import { useThemeHelper } from "./../../libs";

import { CONSTANTS } from "./config";
import FilterContainer from "./FilterContainer";
import {
  buildTableColumns,
  getFiltersSetterByType,
  getRecordsFetcherByType
} from "./helpers";
import RecordListToolbar from "./RecordListToolbar";
import { selectListHeaders } from "./selectors";
import styles from "./styles.css";
import { ViewModal } from "./view-modal";

const Container = ({ match }) => {
  const i18n = useI18n();
  const css = makeStyles(styles)();
  const { theme } = useThemeHelper({});
  const mobileDisplay = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawer, setDrawer] = useState(false);
  const { params, url } = match;
  const { recordType } = params;
  const dispatch = useDispatch();
  const headers = useSelector(state => selectListHeaders(state, recordType));

  const [openViewModal, setOpenViewModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);

  const userPermissions = useSelector(state =>
    getPermissionsByRecord(state, recordType)
  );

  const canViewModal = checkPermissions(userPermissions, [
    PERMISSION_CONSTANTS.DISPLAY_VIEW_PAGE
  ]);

  const handleViewModalClose = () => {
    setOpenViewModal(false);
  };

  // eslint-disable-next-line camelcase
  const { id_search, query } = useSelector(
    state => {
      const filters = selectFiltersByRecordType(state, recordType);
      return { id_search: filters.id_search, query: filters.query };
    },
    (filters1, filters2) => {
      return (
        filters1.id_search === filters2.id_search &&
        filters1.query === filters2.query
      );
    }
  );

  const permissions = useSelector(state =>
    getPermissionsByRecord(state, recordType)
  );

  const setFilters = getFiltersSetterByType(recordType);

  const fetchRecords = getRecordsFetcherByType(recordType);

  useEffect(() => {
    return () => {
      dispatch(setFilters({ options: { id_search: null, query: "" } }));
    };
  }, [url]);

  const canSearchOthers =
    permissions.includes(PERMISSION_CONSTANTS.MANAGE) ||
    permissions.includes(PERMISSION_CONSTANTS.SEARCH_OWNED_BY_OTHERS);

  const listHeaders =
    // eslint-disable-next-line camelcase
    id_search && canSearchOthers
      ? headers.filter(header => header.id_search)
      : headers;

  const defaultFilters = fromJS({
    fields: "short",
    per: 20,
    page: 1,
    id_search,
    query,
    ...{
      ...(recordType === "cases"
        ? { status: ["open"], record_state: ["true"] }
        : {})
    },
    ...{
      ...(recordType === "incidents"
        ? { status: ["open"], record_state: ["true"] }
        : {})
    },
    ...{
      ...(recordType === "tracing_requests"
        ? { status: ["open"], record_state: ["true"] }
        : {})
    }
  });

  const indexTableProps = {
    recordType,
    defaultFilters,
    columns: buildTableColumns(listHeaders, i18n, recordType),
    onTableChange: fetchRecords,
    onRowClick: record => {
      const allowedToOpenRecord =
        record && typeof record.get("record_in_scope") !== "undefined"
        ? record.get("record_in_scope") : false;
      if (allowedToOpenRecord) {
        dispatch(push(`${recordType}/${record.get("id")}`));
      } else if (canViewModal) {
        setCurrentRecord(record);
        setOpenViewModal(true);
      }
    }
  };

  const handleDrawer = () => {
    setDrawer(!drawer);
  };

  const filterContainerProps = {
    mobileDisplay,
    drawer,
    handleDrawer
  };

  const recordSearchProps = {
    recordType,
    setFilters
  };

  const recordListToolbarProps = {
    title: i18n.t(`${recordType}.label`),
    recordType,
    handleDrawer,
    mobileDisplay
  };

  const filterProps = {
    recordType,
    defaultFilters
  };

  return (
    <>
      <PageContainer>
        <Box className={css.content}>
          <Box className={css.tableContainer} flexGrow={1}>
            <RecordListToolbar {...recordListToolbarProps} />
            <Box className={css.table}>
              <IndexTable {...indexTableProps} />
            </Box>
          </Box>
          <FilterContainer {...filterContainerProps}>
            <RecordSearch {...recordSearchProps} />
            <Filters {...filterProps} />
          </FilterContainer>
        </Box>
      </PageContainer>
      <Permission
        permissionType={recordType}
        permission={[PERMISSION_CONSTANTS.MANAGE, PERMISSION_CONSTANTS.DISPLAY_VIEW_PAGE]}
      >
        <ViewModal
          close={handleViewModalClose}
          openViewModal={openViewModal}
          currentRecord={currentRecord}
        />
      </Permission>
    </>
  );
};

Container.displayName = CONSTANTS.name;

Container.propTypes = {
  match: PropTypes.object.isRequired
};

export default withRouter(Container);
