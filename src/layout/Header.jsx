import PropTypes from "prop-types";
import React, { useRef, useContext, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { imageOK, toAbsoluteUrl } from "@util";
import { FhirClientContext } from "../context/FhirClientContext";
import PatientInfo from "../components/PatientInfo";

export default function Header(props) {
  const { patient } = useContext(FhirClientContext);
  const theme = useTheme();
  const desktopImgRef = useRef(null);
  const mobileImgRef = useRef(null);

  const { returnURL } = props;
  const getDesktopImgSrc = async () => {
    return toAbsoluteUrl(`/assets/default/img/logo.png`);
  };
  const getMobileImgSrc = async () => {
    return toAbsoluteUrl(`/assets/default/img/logo_mobile.png`);
  };
  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("ghost");
      return;
    }
    e.target.classList.remove("ghost");
  };
  const shouldHideReturnButton = () => !returnURL;

  const renderTitle = () => {
    return (
      <Typography
        variant="h5"
        component="h1"
        color="primary"
        sx={{
          fontSize: "1.3rem",
        }}
      >
        HPAI QR Report
      </Typography>
    );
  };

  const renderLogo = () => {
    return (
      <>
        <Box
          sx={{
            display: {
              xs: "none",
              sm: "none",
              md: "inline-flex",
            },
          }}
        >
          <button
            onClick={() => (window.location = returnURL + "/clear_session")}
            style={{
              background: "none",
              border: 0,
            }}
          >
            <img
              className="logo header-logo ghost"
              ref={desktopImgRef}
              alt={"project logo"}
              style={{
                height: 40,
                cursor: "pointer",
              }}
              onLoad={handleImageLoaded}
              onError={handleImageLoaded}
            ></img>
          </button>
        </Box>
        <Box
          sx={{
            display: {
              xs: "inline-flex",
              sm: "inline-flex",
              md: "none",
            },
          }}
        >
          <button
            onClick={() => (window.location = returnURL + "/clear_session")}
            style={{
              background: "none",
              border: 0,
            }}
          >
            <img
              ref={mobileImgRef}
              alt={"project logo"}
              onLoad={handleImageLoaded}
              onError={handleImageLoaded}
              className="logo ghost"
              style={{
                cursor: "pointer",
                height: 40,
              }}
            ></img>
          </button>
        </Box>
      </>
    );
  };
  const renderPatientInfo = () => {
    if (!patient) {
      return null;
    }
    return <PatientInfo patient={patient}></PatientInfo>;
  };
  const renderReturnButton = (props) => {
    return (
      <Box className="print-hidden">
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          className="btn-return-url"
          startIcon={<ArrowBackIcon></ArrowBackIcon>}
          size="medium"
          variant="contained"
          {...props}
        >
          Patient List
        </Button>
      </Box>
    );
  };

  useEffect(() => {
    if (!desktopImgRef.current) return;
    getDesktopImgSrc().then((url) => (desktopImgRef.current.src = url));
  }, []);

  useEffect(() => {
    if (!mobileImgRef.current) return;
    getMobileImgSrc().then((url) => (mobileImgRef.current.src = url));
  }, []);

  return (
    <>
      <AppBar position="fixed" elevation={1} sx={{ paddingRight: "0 !important", paddingLeft: "0 !important" }}>
        <Toolbar
          sx={{
            backgroundColor: theme.palette.lighter ? theme.palette.lighter.main : "#FFF",
            color: theme.palette.secondary ? theme.palette.secondary.main : "#444",
            zIndex: (theme) => theme.zIndex.drawer + 1,
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
          }}
          disableGutters
          variant="dense"
        >
          <Stack
            direction={"row"}
            spacing={{
              xs: 1,
              sm: 1,
              md: 1.25,
            }}
            alignItems="center"
            sx={{ width: "100%" }}
          >
            {renderLogo()}
            {renderTitle()}
            <Stack direction={"row"} sx={{ flex: "1 1" }} alignItems="center">
              {renderPatientInfo()}
              {!shouldHideReturnButton && renderReturnButton()}
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
    </>
  );
}

Header.propTypes = {
  returnURL: PropTypes.string,
};
