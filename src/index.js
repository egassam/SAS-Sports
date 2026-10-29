import {kstateSchool,createKStateHandlers} from './schools/kstate.mjs';
import schools from './schools.json';
import sponsoredSports from './sponsored-sports.json';
import teamThemes from './team-themes.json';
import {catalogCards,catalogRevision,catalogDerived,syncCatalog,storeMatches,bundledStore,d1Store,catalogMenu,catalogEntries,catalogRecords,catalogOpponent,catalogHostKnown,catalogMembers,catalogAllRecords} from './catalog.mjs';
import {rosterSocialInstagrams} from './roster-socials.js';
import {OPENDORSE_PROFILE,opendorseSlug,opendorseInstagram} from './opendorse.mjs';
import {INFLCR_SCHOOLS,inflcrInstagram} from './inflcr.mjs';
import {extractText} from 'unpdf';
import {golfStoryPlace} from './sidearm-school-kit.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from './schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from './schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from './schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from './schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from './schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from './schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers} from './schools/arizona.mjs';
import {baylorSchool,createBaylorHandlers} from './schools/baylor.mjs';
import {cincinnatiSchool,createCincinnatiHandlers} from './schools/cincinnati.mjs';
import {coloradoSchool,createColoradoHandlers} from './schools/colorado.mjs';
import {houstonSchool,createHoustonHandlers} from './schools/houston.mjs';
import {iowaStateSchool,createIowaStateHandlers} from './schools/iowa-state.mjs';
import {tcuSchool,createTcuHandlers} from './schools/tcu.mjs';
import {texasTechSchool,createTexasTechHandlers} from './schools/texas-tech.mjs';
import {westVirginiaSchool,createWestVirginiaHandlers} from './schools/west-virginia.mjs';
import {alabamaSchool,createAlabamaHandlers} from './schools/alabama.mjs';
import {floridaSchool,createFloridaHandlers} from './schools/florida.mjs';
import {georgiaSchool,createGeorgiaHandlers} from './schools/georgia.mjs';
import {lsuSchool,createLsuHandlers} from './schools/lsu.mjs';
import {oleMissSchool,createOleMissHandlers} from './schools/ole-miss.mjs';
import {mississippiStateSchool,createMississippiStateHandlers} from './schools/mississippi-state.mjs';
import {tennesseeSchool,createTennesseeHandlers} from './schools/tennessee.mjs';
import {missouriSchool,createMissouriHandlers} from './schools/missouri.mjs';
import {texasSchool,createTexasHandlers} from './schools/texas.mjs';
import {texasAmSchool,createTexasAmHandlers} from './schools/texas-am.mjs';
import {arkansasSchool,createArkansasHandlers} from './schools/arkansas.mjs';
import {auburnSchool,createAuburnHandlers} from './schools/auburn.mjs';
import {oklahomaSchool,createOklahomaHandlers} from './schools/oklahoma.mjs';
import {kentuckySchool,createKentuckyHandlers} from './schools/kentucky.mjs';
import {southCarolinaSchool,createSouthCarolinaHandlers} from './schools/south-carolina.mjs';
import {vanderbiltSchool,createVanderbiltHandlers} from './schools/vanderbilt.mjs';
import {illinoisSchool,createIllinoisHandlers} from './schools/illinois.mjs';
import {indianaSchool,createIndianaHandlers} from './schools/indiana.mjs';
import {iowaSchool,createIowaHandlers} from './schools/iowa.mjs';
import {marylandSchool,createMarylandHandlers} from './schools/maryland.mjs';
import {michiganSchool,createMichiganHandlers} from './schools/michigan.mjs';
import {michiganStateSchool,createMichiganStateHandlers} from './schools/michigan-state.mjs';
import {nebraskaSchool,createNebraskaHandlers} from './schools/nebraska.mjs';
import {minnesotaSchool,createMinnesotaHandlers} from './schools/minnesota.mjs';
import {northwesternSchool,createNorthwesternHandlers} from './schools/northwestern.mjs';
import {ohioStateSchool,createOhioStateHandlers} from './schools/ohio-state.mjs';
import {oregonSchool,createOregonHandlers} from './schools/oregon.mjs';
import {pennStateSchool,createPennStateHandlers} from './schools/penn-state.mjs';
import {createSourceFetch,SOURCE_TTL} from './source-fetch.mjs';
import {createConferenceGames} from './conference-games.mjs';
import {oneTournamentPerStory} from './sidearm-schedule-reader.mjs';
import {calendarEvents,maxprepsContests,maxprepsBoxScore,isNamedEvent,nameKey,namesCompatible,TENNIS_REPORTING,tennisReportingEvents,tennisHosts,tennisMatches,tennisTeamStanding,meetProResults,athleticLiveXcRaces,ATHLETIC_LIVE_DOCS,meetProDate,meetProLinks,meetProTrackIndex,meetProTrackEvent,meetProTrackTeam,meetProTrackGroup,meetProTrackRecent,PREP_GOLF,prepGolfTournaments,prepGolfResults,BOUND_API,boundFinals,boundGame,boundMeet,BOUND_ACTS,boundEventsUrl,boundSchedule,boundDedupe,boundTeamPlace,apptegyCalendar} from './high-school.mjs';
import {manhattanKsSchool} from './schools/manhattan-ks.mjs';
import {anthonyMsSchool,eisenhowerMsSchool} from './schools/manhattan-ks-middle.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from './schools/riley-pottawatomie-ks.mjs';
import {KAS_KS_HIGH_SCHOOLS} from './schools/kas-ks.mjs';
import {proTeam,wallClock,espnTeamGames,espnGameHighlights,espnLiveDetails,applyEspnLive,nascarRaces,nascarDrivers,nascarRaceDetails,nascarFinishRows,nascarFinishTable,ESPN_SITE,NASCAR_FEEDS,IMSA_RESULTS,IMSA_CALENDARS,imsaListing,imsaRaceSessions,imsaResultsFile,imsaHourFolders,imsaTrack,imsaRaces,imsaRaceDetails,F1_RESULTS,JOLPICA_F1,f1SeasonResults,f1SeasonRow,f1Classification,f1JolpicaClassification,f1DriverTable,f1Calendar,f1Races,f1RaceDetails,f1LiveDetails} from './pro-sports.mjs';
import {purdueSchool,createPurdueHandlers} from './schools/purdue.mjs';
import {rutgersSchool,createRutgersHandlers} from './schools/rutgers.mjs';
import {uclaSchool,createUclaHandlers} from './schools/ucla.mjs';
import {uscSchool,createUscHandlers} from './schools/usc.mjs';
import {washingtonSchool,createWashingtonHandlers} from './schools/washington.mjs';
import {wisconsinSchool,createWisconsinHandlers} from './schools/wisconsin.mjs';
import {miamiSchool,createMiamiHandlers} from './schools/miami.mjs';
import {virginiaSchool,createVirginiaHandlers} from './schools/virginia.mjs';
import {bostonCollegeSchool,createBostonCollegeHandlers} from './schools/boston-college.mjs';
import {californiaSchool,createCaliforniaHandlers} from './schools/california.mjs';
import {clemsonSchool,createClemsonHandlers} from './schools/clemson.mjs';
import {dukeSchool,createDukeHandlers} from './schools/duke.mjs';
import {floridaStateSchool,createFloridaStateHandlers} from './schools/florida-state.mjs';
import {georgiaTechSchool,createGeorgiaTechHandlers} from './schools/georgia-tech.mjs';
import {louisvilleSchool,createLouisvilleHandlers} from './schools/louisville.mjs';
import {ncStateSchool,createNcStateHandlers} from './schools/nc-state.mjs';
import {northCarolinaSchool,createNorthCarolinaHandlers} from './schools/north-carolina.mjs';
import {notreDameSchool,createNotreDameHandlers} from './schools/notre-dame.mjs';
import {pittSchool,createPittHandlers} from './schools/pitt.mjs';
import {smuSchool,createSmuHandlers} from './schools/smu.mjs';
import {stanfordSchool,createStanfordHandlers} from './schools/stanford.mjs';
import {syracuseSchool,createSyracuseHandlers} from './schools/syracuse.mjs';
import {wakeForestSchool,createWakeForestHandlers} from './schools/wake-forest.mjs';
import {virginiaTechSchool,createVirginiaTechHandlers} from './schools/virginia-tech.mjs';
import {boiseStateSchool,createBoiseStateHandlers} from './schools/boise-state.mjs';
import {coloradoStateSchool,createColoradoStateHandlers} from './schools/colorado-state.mjs';
import {fresnoStateSchool,createFresnoStateHandlers} from './schools/fresno-state.mjs';
import {gonzagaSchool,createGonzagaHandlers} from './schools/gonzaga.mjs';
import {oregonStateSchool,createOregonStateHandlers} from './schools/oregon-state.mjs';
import {sanDiegoStateSchool,createSanDiegoStateHandlers} from './schools/san-diego-state.mjs';
import {washingtonStateSchool,createWashingtonStateHandlers} from './schools/washington-state.mjs';
import {creightonSchool,createCreightonHandlers} from './schools/creighton.mjs';
import {depaulSchool,createDepaulHandlers} from './schools/depaul.mjs';
import {marquetteSchool,createMarquetteHandlers} from './schools/marquette.mjs';
import {providenceSchool,createProvidenceHandlers} from './schools/providence.mjs';
import {setonHallSchool,createSetonHallHandlers} from './schools/seton-hall.mjs';
import {stJohnsSchool,createStJohnsHandlers} from './schools/st-johns.mjs';
import {uconnSchool,createUconnHandlers} from './schools/uconn.mjs';
import {xavierSchool,createXavierHandlers} from './schools/xavier.mjs';
import {montanaSchool,createMontanaHandlers} from './schools/montana.mjs';
import {montanaStateSchool,createMontanaStateHandlers} from './schools/montana-state.mjs';
import {idahoStateSchool,createIdahoStateHandlers} from './schools/idaho-state.mjs';
import {easternWashingtonSchool,createEasternWashingtonHandlers} from './schools/eastern-washington.mjs';
import {northernArizonaSchool,createNorthernArizonaHandlers} from './schools/northern-arizona.mjs';
import {northernColoradoSchool,createNorthernColoradoHandlers} from './schools/northern-colorado.mjs';
import {portlandStateSchool,createPortlandStateHandlers} from './schools/portland-state.mjs';
import {weberStateSchool,createWeberStateHandlers} from './schools/weber-state.mjs';
import {southernUtahSchool,createSouthernUtahHandlers} from './schools/southern-utah.mjs';
import {utahTechSchool,createUtahTechHandlers} from './schools/utah-tech.mjs';
import {arkansasStateSchool,createArkansasStateHandlers} from './schools/arkansas-state.mjs';
import {coastalCarolinaSchool,createCoastalCarolinaHandlers} from './schools/coastal-carolina.mjs';
import {georgiaSouthernSchool,createGeorgiaSouthernHandlers} from './schools/georgia-southern.mjs';
import {jamesMadisonSchool,createJamesMadisonHandlers} from './schools/james-madison.mjs';
import {louisianaSchool,createLouisianaHandlers} from './schools/louisiana.mjs';
import {louisianaTechSchool,createLouisianaTechHandlers} from './schools/louisiana-tech.mjs';
import {marshallSchool,createMarshallHandlers} from './schools/marshall.mjs';
import {oldDominionSchool,createOldDominionHandlers} from './schools/old-dominion.mjs';
import {southAlabamaSchool,createSouthAlabamaHandlers} from './schools/south-alabama.mjs';
import {southernMissSchool,createSouthernMissHandlers} from './schools/southern-miss.mjs';
import {troySchool,createTroyHandlers} from './schools/troy.mjs';
import {ulmSchool,createUlmHandlers} from './schools/ulm.mjs';
import {airForceSchool,createAirForceHandlers} from './schools/air-force.mjs';
import {grandCanyonSchool,createGrandCanyonHandlers} from './schools/grand-canyon.mjs';
import {newMexicoSchool,createNewMexicoHandlers} from './schools/new-mexico.mjs';
import {sanJoseStateSchool,createSanJoseStateHandlers} from './schools/san-jose-state.mjs';
import {ucDavisSchool,createUcDavisHandlers} from './schools/uc-davis.mjs';
import {unlvSchool,createUnlvHandlers} from './schools/unlv.mjs';
import {utepSchool,createUtepHandlers} from './schools/utep.mjs';
import {akronSchool,createAkronHandlers} from './schools/akron.mjs';
import {ballStateSchool,createBallStateHandlers} from './schools/ball-state.mjs';
import {bowlingGreenSchool,createBowlingGreenHandlers} from './schools/bowling-green.mjs';
import {buffaloSchool,createBuffaloHandlers} from './schools/buffalo.mjs';
import {centralMichiganSchool,createCentralMichiganHandlers} from './schools/central-michigan.mjs';
import {easternMichiganSchool,createEasternMichiganHandlers} from './schools/eastern-michigan.mjs';
import {kentStateSchool,createKentStateHandlers} from './schools/kent-state.mjs';
import {miamiOhSchool,createMiamiOhHandlers} from './schools/miami-oh.mjs';
import {ohioSchool,createOhioHandlers} from './schools/ohio.mjs';
import {toledoSchool,createToledoHandlers} from './schools/toledo.mjs';
import {umassSchool,createUmassHandlers} from './schools/umass.mjs';
import {calBaptistSchool,createCalBaptistHandlers} from './schools/cal-baptist.mjs';
import {calPolySchool,createCalPolyHandlers} from './schools/cal-poly.mjs';
import {calStateFullertonSchool,createCalStateFullertonHandlers} from './schools/cal-state-fullerton.mjs';
import {csunSchool,createCsunHandlers} from './schools/csun.mjs';
import {longBeachStateSchool,createLongBeachStateHandlers} from './schools/long-beach-state.mjs';
import {ucIrvineSchool,createUcIrvineHandlers} from './schools/uc-irvine.mjs';
import {ucRiversideSchool,createUcRiversideHandlers} from './schools/uc-riverside.mjs';
import {ucSanDiegoSchool,createUcSanDiegoHandlers} from './schools/uc-san-diego.mjs';
import {sacramentoStateSchool,createSacramentoStateHandlers} from './schools/sacramento-state.mjs';
import {utahValleySchool,createUtahValleyHandlers} from './schools/utah-valley.mjs';
import {csuBakersfieldSchool,createCsuBakersfieldHandlers} from './schools/csu-bakersfield.mjs';
import {ucSantaBarbaraSchool,createUcSantaBarbaraHandlers} from './schools/uc-santa-barbara.mjs';
import {charlotteSchool,createCharlotteHandlers} from './schools/charlotte.mjs';
import {eastCarolinaSchool,createEastCarolinaHandlers} from './schools/east-carolina.mjs';
import {fauSchool,createFauHandlers} from './schools/fau.mjs';
import {memphisSchool,createMemphisHandlers} from './schools/memphis.mjs';
import {northTexasSchool,createNorthTexasHandlers} from './schools/north-texas.mjs';
import {riceSchool,createRiceHandlers} from './schools/rice.mjs';
import {southFloridaSchool,createSouthFloridaHandlers} from './schools/south-florida.mjs';
import {templeSchool,createTempleHandlers} from './schools/temple.mjs';
import {tulaneSchool,createTulaneHandlers} from './schools/tulane.mjs';
import {tulsaSchool,createTulsaHandlers} from './schools/tulsa.mjs';
import {uabSchool,createUabHandlers} from './schools/uab.mjs';
import {utsaSchool,createUtsaHandlers} from './schools/utsa.mjs';
import {delawareSchool,createDelawareHandlers} from './schools/delaware.mjs';
import {fiuSchool,createFiuHandlers} from './schools/fiu.mjs';
import {jacksonvilleStateSchool,createJacksonvilleStateHandlers} from './schools/jacksonville-state.mjs';
import {libertySchool,createLibertyHandlers} from './schools/liberty.mjs';
import {middleTennesseeSchool,createMiddleTennesseeHandlers} from './schools/middle-tennessee.mjs';
import {missouriStateSchool,createMissouriStateHandlers} from './schools/missouri-state.mjs';
import {samHoustonSchool,createSamHoustonHandlers} from './schools/sam-houston.mjs';
import {westernKentuckySchool,createWesternKentuckyHandlers} from './schools/western-kentucky.mjs';
import {lmuSchool,createLmuHandlers} from './schools/lmu.mjs';
import {pacificSchool,createPacificHandlers} from './schools/pacific.mjs';
import {pepperdineSchool,createPepperdineHandlers} from './schools/pepperdine.mjs';
import {portlandSchool,createPortlandHandlers} from './schools/portland.mjs';
import {saintMarysSchool,createSaintMarysHandlers} from './schools/saint-marys.mjs';
import {sanFranciscoSchool,createSanFranciscoHandlers} from './schools/san-francisco.mjs';
import {santaClaraSchool,createSantaClaraHandlers} from './schools/santa-clara.mjs';
import {seattleUSchool,createSeattleUHandlers} from './schools/seattle-u.mjs';
import {denverSchool,createDenverHandlers} from './schools/denver.mjs';
import {davidsonSchool,createDavidsonHandlers} from './schools/davidson.mjs';
import {duquesneSchool,createDuquesneHandlers} from './schools/duquesne.mjs';
import {fordhamSchool,createFordhamHandlers} from './schools/fordham.mjs';
import {georgeMasonSchool,createGeorgeMasonHandlers} from './schools/george-mason.mjs';
import {georgeWashingtonSchool,createGeorgeWashingtonHandlers} from './schools/george-washington.mjs';
import {laSalleSchool,createLaSalleHandlers} from './schools/la-salle.mjs';
import {rhodeIslandSchool,createRhodeIslandHandlers} from './schools/rhode-island.mjs';
import {richmondSchool,createRichmondHandlers} from './schools/richmond.mjs';
import {saintJosephsSchool,createSaintJosephsHandlers} from './schools/saint-josephs.mjs';
import {saintLouisSchool,createSaintLouisHandlers} from './schools/saint-louis.mjs';
import {evansvilleSchool,createEvansvilleHandlers} from './schools/evansville.mjs';
import {illinoisStateSchool,createIllinoisStateHandlers} from './schools/illinois-state.mjs';
import {indianaStateSchool,createIndianaStateHandlers} from './schools/indiana-state.mjs';
import {murrayStateSchool,createMurrayStateHandlers} from './schools/murray-state.mjs';
import {northernIowaSchool,createNorthernIowaHandlers} from './schools/northern-iowa.mjs';
import {southernIllinoisSchool,createSouthernIllinoisHandlers} from './schools/southern-illinois.mjs';
import {valparaisoSchool,createValparaisoHandlers} from './schools/valparaiso.mjs';
import {belmontSchool,createBelmontHandlers} from './schools/belmont.mjs';
import {austinPeaySchool,createAustinPeayHandlers} from './schools/austin-peay.mjs';
import {bellarmineSchool,createBellarmineHandlers} from './schools/bellarmine.mjs';
import {centralArkansasSchool,createCentralArkansasHandlers} from './schools/central-arkansas.mjs';
import {easternKentuckySchool,createEasternKentuckyHandlers} from './schools/eastern-kentucky.mjs';
import {jacksonvilleSchool,createJacksonvilleHandlers} from './schools/jacksonville.mjs';
import {lipscombSchool,createLipscombHandlers} from './schools/lipscomb.mjs';
import {northAlabamaSchool,createNorthAlabamaHandlers} from './schools/north-alabama.mjs';
import {northFloridaSchool,createNorthFloridaHandlers} from './schools/north-florida.mjs';
import {queensSchool,createQueensHandlers} from './schools/queens.mjs';
import {westGeorgiaSchool,createWestGeorgiaHandlers} from './schools/west-georgia.mjs';
import {abileneChristianSchool,createAbileneChristianHandlers} from './schools/abilene-christian.mjs';
import {tarletonStateSchool,createTarletonStateHandlers} from './schools/tarleton-state.mjs';
import {utArlingtonSchool,createUtArlingtonHandlers} from './schools/ut-arlington.mjs';
import {westFloridaSchool,createWestFloridaHandlers} from './schools/west-florida.mjs';
import {ualbanySchool,createUalbanyHandlers} from './schools/ualbany.mjs';
import {binghamtonSchool,createBinghamtonHandlers} from './schools/binghamton.mjs';
import {bryantSchool,createBryantHandlers} from './schools/bryant.mjs';
import {maineSchool,createMaineHandlers} from './schools/maine.mjs';
import {newHampshireSchool,createNewHampshireHandlers} from './schools/new-hampshire.mjs';
import {njitSchool,createNjitHandlers} from './schools/njit.mjs';
import {umassLowellSchool,createUmassLowellHandlers} from './schools/umass-lowell.mjs';
import {umbcSchool,createUmbcHandlers} from './schools/umbc.mjs';
import {charlestonSouthernSchool,createCharlestonSouthernHandlers} from './schools/charleston-southern.mjs';
import {gardnerWebbSchool,createGardnerWebbHandlers} from './schools/gardner-webb.mjs';
import {highPointSchool,createHighPointHandlers} from './schools/high-point.mjs';
import {presbyterianSchool,createPresbyterianHandlers} from './schools/presbyterian.mjs';
import {radfordSchool,createRadfordHandlers} from './schools/radford.mjs';
import {uncAshevilleSchool,createUncAshevilleHandlers} from './schools/unc-asheville.mjs';
import {uscUpstateSchool,createUscUpstateHandlers} from './schools/usc-upstate.mjs';
import {winthropSchool,createWinthropHandlers} from './schools/winthrop.mjs';
import {campbellSchool,createCampbellHandlers} from './schools/campbell.mjs';
import {charlestonSchool,createCharlestonHandlers} from './schools/charleston.mjs';
import {drexelSchool,createDrexelHandlers} from './schools/drexel.mjs';
import {elonSchool,createElonHandlers} from './schools/elon.mjs';
import {hamptonSchool,createHamptonHandlers} from './schools/hampton.mjs';
import {hofstraSchool,createHofstraHandlers} from './schools/hofstra.mjs';
import {monmouthSchool,createMonmouthHandlers} from './schools/monmouth.mjs';
import {ncAtSchool,createNcAtHandlers} from './schools/nc-at.mjs';
import {stonyBrookSchool,createStonyBrookHandlers} from './schools/stony-brook.mjs';
import {towsonSchool,createTowsonHandlers} from './schools/towson.mjs';
import {williamMarySchool,createWilliamMaryHandlers} from './schools/william-mary.mjs';
import {clevelandStateSchool,createClevelandStateHandlers} from './schools/cleveland-state.mjs';
import {detroitMercySchool,createDetroitMercyHandlers} from './schools/detroit-mercy.mjs';
import {greenBaySchool,createGreenBayHandlers} from './schools/green-bay.mjs';
import {iuIndySchool,createIuIndyHandlers} from './schools/iu-indy.mjs';
import {milwaukeeSchool,createMilwaukeeHandlers} from './schools/milwaukee.mjs';
import {purdueFortWayneSchool,createPurdueFortWayneHandlers} from './schools/purdue-fort-wayne.mjs';
import {robertMorrisSchool,createRobertMorrisHandlers} from './schools/robert-morris.mjs';
import {wrightStateSchool,createWrightStateHandlers} from './schools/wright-state.mjs';
import {youngstownStateSchool,createYoungstownStateHandlers} from './schools/youngstown-state.mjs';
import {northernIllinoisSchool,createNorthernIllinoisHandlers} from './schools/northern-illinois.mjs';
import {brownSchool,createBrownHandlers} from './schools/brown.mjs';
import {columbiaSchool,createColumbiaHandlers} from './schools/columbia.mjs';
import {cornellSchool,createCornellHandlers} from './schools/cornell.mjs';
import {dartmouthSchool,createDartmouthHandlers} from './schools/dartmouth.mjs';
import {pennSchool,createPennHandlers} from './schools/penn.mjs';
import {princetonSchool,createPrincetonHandlers} from './schools/princeton.mjs';
import {fairfieldSchool,createFairfieldHandlers} from './schools/fairfield.mjs';
import {manhattanSchool,createManhattanHandlers} from './schools/manhattan.mjs';
import {maristSchool,createMaristHandlers} from './schools/marist.mjs';
import {merrimackSchool,createMerrimackHandlers} from './schools/merrimack.mjs';
import {mountStMarysSchool,createMountStMarysHandlers} from './schools/mount-st-marys.mjs';
import {niagaraSchool,createNiagaraHandlers} from './schools/niagara.mjs';
import {quinnipiacSchool,createQuinnipiacHandlers} from './schools/quinnipiac.mjs';
import {riderSchool,createRiderHandlers} from './schools/rider.mjs';
import {sacredHeartSchool,createSacredHeartHandlers} from './schools/sacred-heart.mjs';
import {sienaSchool,createSienaHandlers} from './schools/siena.mjs';
import {coppinStateSchool,createCoppinStateHandlers} from './schools/coppin-state.mjs';
import {delawareStateSchool,createDelawareStateHandlers} from './schools/delaware-state.mjs';
import {marylandEasternShoreSchool,createMarylandEasternShoreHandlers} from './schools/maryland-eastern-shore.mjs';
import {morganStateSchool,createMorganStateHandlers} from './schools/morgan-state.mjs';
import {norfolkStateSchool,createNorfolkStateHandlers} from './schools/norfolk-state.mjs';
import {ncCentralSchool,createNcCentralHandlers} from './schools/nc-central.mjs';
import {southCarolinaStateSchool,createSouthCarolinaStateHandlers} from './schools/south-carolina-state.mjs';
import {chicagoStateSchool,createChicagoStateHandlers} from './schools/chicago-state.mjs';
import {leMoyneSchool,createLeMoyneHandlers} from './schools/le-moyne.mjs';
import {liuSchool,createLiuHandlers} from './schools/liu.mjs';
import {mercyhurstSchool,createMercyhurstHandlers} from './schools/mercyhurst.mjs';
import {newHavenSchool,createNewHavenHandlers} from './schools/new-haven.mjs';
import {stonehillSchool,createStonehillHandlers} from './schools/stonehill.mjs';
import {wagnerSchool,createWagnerHandlers} from './schools/wagner.mjs';
import {easternIllinoisSchool,createEasternIllinoisHandlers} from './schools/eastern-illinois.mjs';
import {lindenwoodSchool,createLindenwoodHandlers} from './schools/lindenwood.mjs';
import {moreheadStateSchool,createMoreheadStateHandlers} from './schools/morehead-state.mjs';
import {siueSchool,createSiueHandlers} from './schools/siue.mjs';
import {southeastMissouriSchool,createSoutheastMissouriHandlers} from './schools/southeast-missouri.mjs';
import {southernIndianaSchool,createSouthernIndianaHandlers} from './schools/southern-indiana.mjs';
import {tennesseeStateSchool,createTennesseeStateHandlers} from './schools/tennessee-state.mjs';
import {utMartinSchool,createUtMartinHandlers} from './schools/ut-martin.mjs';
import {westernIllinoisSchool,createWesternIllinoisHandlers} from './schools/western-illinois.mjs';
import {americanSchool,createAmericanHandlers} from './schools/american.mjs';
import {armySchool,createArmyHandlers} from './schools/army.mjs';
import {bostonUniversitySchool,createBostonUniversityHandlers} from './schools/boston-university.mjs';
import {bucknellSchool,createBucknellHandlers} from './schools/bucknell.mjs';
import {holyCrossSchool,createHolyCrossHandlers} from './schools/holy-cross.mjs';
import {lafayetteSchool,createLafayetteHandlers} from './schools/lafayette.mjs';
import {lehighSchool,createLehighHandlers} from './schools/lehigh.mjs';
import {loyolaMarylandSchool,createLoyolaMarylandHandlers} from './schools/loyola-maryland.mjs';
import {chattanoogaSchool,createChattanoogaHandlers} from './schools/chattanooga.mjs';
import {citadelSchool,createCitadelHandlers} from './schools/citadel.mjs';
import {eastTennesseeStateSchool,createEastTennesseeStateHandlers} from './schools/east-tennessee-state.mjs';
import {mercerSchool,createMercerHandlers} from './schools/mercer.mjs';
import {samfordSchool,createSamfordHandlers} from './schools/samford.mjs';
import {uncGreensboroSchool,createUncGreensboroHandlers} from './schools/unc-greensboro.mjs';
import {vmiSchool,createVmiHandlers} from './schools/vmi.mjs';
import {westernCarolinaSchool,createWesternCarolinaHandlers} from './schools/western-carolina.mjs';
import {eastTexasAmSchool,createEastTexasAmHandlers} from './schools/east-texas-am.mjs';
import {houstonChristianSchool,createHoustonChristianHandlers} from './schools/houston-christian.mjs';
import {incarnateWordSchool,createIncarnateWordHandlers} from './schools/incarnate-word.mjs';
import {lamarSchool,createLamarHandlers} from './schools/lamar.mjs';
import {mcneeseSchool,createMcneeseHandlers} from './schools/mcneese.mjs';
import {newOrleansSchool,createNewOrleansHandlers} from './schools/new-orleans.mjs';
import {nichollsSchool,createNichollsHandlers} from './schools/nicholls.mjs';
import {northwesternStateSchool,createNorthwesternStateHandlers} from './schools/northwestern-state.mjs';
import {southeasternLouisianaSchool,createSoutheasternLouisianaHandlers} from './schools/southeastern-louisiana.mjs';
import {stephenFAustinSchool,createStephenFAustinHandlers} from './schools/stephen-f-austin.mjs';
import {utrgvSchool,createUtrgvHandlers} from './schools/utrgv.mjs';
import {kansasCitySchool,createKansasCityHandlers} from './schools/kansas-city.mjs';
import {northDakotaStateSchool,createNorthDakotaStateHandlers} from './schools/north-dakota-state.mjs';
import {omahaSchool,createOmahaHandlers} from './schools/omaha.mjs';
import {southDakotaSchool,createSouthDakotaHandlers} from './schools/south-dakota.mjs';
import {southDakotaStateSchool,createSouthDakotaStateHandlers} from './schools/south-dakota-state.mjs';
import {stThomasSchool,createStThomasHandlers} from './schools/st-thomas.mjs';
import {alabamaAmSchool,createAlabamaAmHandlers} from './schools/alabama-am.mjs';
import {alabamaStateSchool,createAlabamaStateHandlers} from './schools/alabama-state.mjs';
import {alcornStateSchool,createAlcornStateHandlers} from './schools/alcorn-state.mjs';
import {bethuneCookmanSchool,createBethuneCookmanHandlers} from './schools/bethune-cookman.mjs';
import {floridaAmSchool,createFloridaAmHandlers} from './schools/florida-am.mjs';
import {jacksonStateSchool,createJacksonStateHandlers} from './schools/jackson-state.mjs';
import {mississippiValleyStateSchool,createMississippiValleyStateHandlers} from './schools/mississippi-valley-state.mjs';
import {arkansasPineBluffSchool,createArkansasPineBluffHandlers} from './schools/arkansas-pine-bluff.mjs';
import {prairieViewAmSchool,createPrairieViewAmHandlers} from './schools/prairie-view-am.mjs';
import {southernSchool,createSouthernHandlers} from './schools/southern.mjs';
import {handleLiveScoring} from './live-scoring/api.mjs';

const VERSION='4.231.2-completed-stories';

const FEED_FRESH_MS=25*1000;
// A feed with a game in progress is rebuilt sooner: the page re-fetches it
// every 15 s. School pages stay cached (source-fetch), so this does not add
// school downloads; the scoreboard itself is cached 15 s.
const LIVE_FEED_FRESH_MS=10*1000;
// A saved feed is answered at once (and rebuilt in the background) only while
// it is recent. An older copy can show a finished game as Today or Live (seen
// after K-State vs BYU, Oct 1: a 16:16 copy served at 02:41), and the page
// then waits 5 minutes before asking again; it is rebuilt before answering,
// and served only if that rebuild fails.
const FEED_SERVE_STALE_MS=2*60*1000;
const FEED_STALE_MS=24*60*60*1000;
// One honest identity for every download, with a page explaining what we
// fetch and how often, so a school can recognise and allowlist us.
const BOT_INFO_URL='https://sas-sports.lovetogivepain.workers.dev/bot';
const HEADERS={
  'User-Agent':`Mozilla/5.0 (compatible; SAS-Sports/${VERSION}; +${BOT_INFO_URL})`,
  'Accept':'text/html,application/xhtml+xml',
  'Accept-Language':'en-US,en;q=0.9'
};
// ESPN's scoreboard API refuses any user agent carrying a web address (403
// from its edge for "+https://.../bot" and "+https://.../about"). Scoreboard
// requests use the same product name without the link (user-approved,
// October 1, 2026); school sites keep the full identity above.
const SCOREBOARD_USER_AGENT=`Mozilla/5.0 (compatible; SAS-Sports/${VERSION})`;
// Every official-site download is cached per Cloudflare location (see
// source-fetch.mjs); the Cache API key uses this Worker's own origin.
let sourceCacheOrigin=null;
const sourceFetch=createSourceFetch({fetch:(...args)=>fetch(...args),headers:HEADERS,cacheOrigin:()=>sourceCacheOrigin});

// School modules. Shared code asks this list instead of naming schools; each
// entry carries the module's school data (routes, Instagram tags, combined
// sports, scoreboards) and only the hooks that school uses. A new module needs
// its import, its handlers (below) and one entry here
// (scripts/scaffold-school.mjs adds all three). Hooks, all optional:
//   parseSchedule(raw,school,sport,url,now)  events, or null for the shared parsers
//   scheduleEvents(merged,raw,school,sport,url,now)  filter/enrich the merged events
//   isEmptySchedule(events,parsed)  the page is a verified empty schedule
//   matchesRecap(html,event,url)  this story is the event's recap
//   crossCountry {matches(event),attach(event)}  official meet results
//   results [{matches,attach}]  other official results, after cross country
//   beforeHighlights(event)  attach a story before the expanded view reads it
//   feed(events,sport)  events, after the feed's pages are merged
//   meetDayIsLast  a multi-day meet's recap is dated its last day
//   newsPath  where the sport's stories are listed (default /news)
//   school.teamLabels {path: label}  the team of a combined sport's page whose
//     address names none
// Hooks run only for their own school (each checks the event's school).
const SCHOOL_MODULES=[
  {school:kstateSchool},
  {school:kansasSchool,parseSchedule:(...args)=>kansasHandlers.parseSchedule(...args),matchesRecap:(...args)=>kansasHandlers.matchesRecap(...args),meetDayIsLast:true},
  {school:oklahomaStateSchool,
    scheduleEvents:(merged,raw,school,sport,url)=>oklahomaStateHandlers.enrichScheduleEvents(oklahomaStateHandlers.filterEvents(merged,school,sport,url),raw,school,sport,url),
    isEmptySchedule:events=>oklahomaStateHandlers.isEmptyProgramSchedule(events),
    crossCountry:{matches:event=>oklahomaStateHandlers.isOklahomaStateCrossCountry(event),attach:event=>oklahomaStateHandlers.attachMeetResults(event)}},
  {school:utahSchool,
    scheduleEvents:(merged,raw,school,sport,url,now)=>utahHandlers.enrichScheduleEvents(utahHandlers.filterEvents(merged,raw,school,sport,url,now),raw,school,sport,url),
    isEmptySchedule:events=>utahHandlers.isEmptySchedule(events),
    crossCountry:{matches:event=>utahHandlers.isUtahCrossCountry(event),attach:event=>utahHandlers.attachMeetResults(event)}},
  {school:arizonaStateSchool,parseSchedule:(...args)=>arizonaStateHandlers.parseSchedule(...args),isEmptySchedule:events=>arizonaStateHandlers.isEmptySchedule(events),crossCountry:{matches:event=>arizonaStateHandlers.isArizonaStateCrossCountry(event),attach:event=>arizonaStateHandlers.attachMeetResults(event)}},
  {school:byuSchool,parseSchedule:(...args)=>byuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>byuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>byuHandlers.matchesRecap(...args),crossCountry:{matches:event=>byuHandlers.isByuCrossCountry(event),attach:event=>byuHandlers.attachMeetResults(event)},meetDayIsLast:true,
    // A past tennis tournament without a card story takes its news story, or
    // is not listed (K-State's rule).
    beforeHighlights:async event=>{if(byuHandlers.isTennisWithoutStory(event))await byuHandlers.attachTennisStory(event);},
    feed:async events=>{await Promise.all(events.filter(byuHandlers.isTennisWithoutStory).map(event=>byuHandlers.attachTennisStory(event)));return events.filter(event=>!byuHandlers.isTennisWithoutStory(event));}},
  {school:ucfSchool,parseSchedule:(...args)=>ucfHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucfHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucfHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucfHandlers.isUcfCrossCountry(event),attach:event=>ucfHandlers.attachMeetResults(event)}},
  {school:arizonaSchool,parseSchedule:(...args)=>arizonaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>arizonaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>arizonaHandlers.matchesRecap(...args),crossCountry:{matches:event=>arizonaHandlers.isArizonaCrossCountry(event),attach:event=>arizonaHandlers.attachMeetResults(event)},
    // Golf results come from each tournament's own story.
    results:[{matches:event=>arizonaHandlers.isArizonaGolf(event),attach:event=>arizonaHandlers.attachGolfResults(event)}],
    // Tennis tournaments take their story from the team's archive.
    beforeHighlights:async event=>{if(arizonaHandlers.isArizonaTennisTournament(event))await arizonaHandlers.attachTennisStory(event);},
    feed:async(events,sport)=>{
      if(sport==='Golf')await Promise.all(events.filter(arizonaHandlers.isArizonaGolf).map(event=>arizonaHandlers.attachGolfResults(event)));
      if(sport==='Tennis'){
        await Promise.all(events.filter(arizonaHandlers.isArizonaTennisTournament).map(event=>arizonaHandlers.attachTennisStory(event)));
        // As K-State's, a past tournament with no team result is listed only
        // when Arizona published a story about it.
        events=events.filter(event=>!arizonaHandlers.isArizonaTennisTournament(event));
      }
      return events;
    },
    // arizonawildcats.com keeps a sport's stories at /archives (/news is a 404).
    newsPath:'/archives'},
  {school:baylorSchool,parseSchedule:(...args)=>baylorHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>baylorHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>baylorHandlers.matchesRecap(...args),crossCountry:{matches:event=>baylorHandlers.isBaylorCrossCountry(event),attach:event=>baylorHandlers.attachMeetResults(event)},
    // Golf finals the schedule links no story for take theirs from the team's
    // archive.
    beforeHighlights:async event=>{if(baylorHandlers.isBaylorGolfWithoutStory(event))await baylorHandlers.attachGolfStory(event);},
    // A past cross country meet with no result, story or TFRRS race is not
    // listed (K-State's rule; the Chile Pepper Festival, Oct 3, until TFRRS
    // publishes it).
    feed:async(events,sport)=>{if(sport==='Golf')await Promise.all(events.filter(baylorHandlers.isBaylorGolfWithoutStory).map(event=>baylorHandlers.attachGolfStory(event)));return events.filter(event=>!(event.sport==='Cross Country'&&event.status==='Final'&&!event.recap_url&&!event.meet_results_verified&&/^(?:Completed)?$/.test(String(event.headline||''))));}},
  {school:cincinnatiSchool,parseSchedule:(...args)=>cincinnatiHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>cincinnatiHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>cincinnatiHandlers.matchesRecap(...args),crossCountry:{matches:event=>cincinnatiHandlers.isCincinnatiCrossCountry(event),attach:event=>cincinnatiHandlers.attachMeetResults(event)}},
  {school:coloradoSchool,parseSchedule:(...args)=>coloradoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>coloradoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>coloradoHandlers.matchesRecap(...args),crossCountry:{matches:event=>coloradoHandlers.isColoradoCrossCountry(event),attach:event=>coloradoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(coloradoHandlers.isColoradoFinalWithoutStory(event))await coloradoHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(coloradoHandlers.isColoradoFinalWithoutStory).map(event=>coloradoHandlers.attachArchiveStory(event)));return events;}}
  ,{school:houstonSchool,parseSchedule:(...args)=>houstonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>houstonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>houstonHandlers.matchesRecap(...args),crossCountry:{matches:event=>houstonHandlers.isHoustonCrossCountry(event),attach:event=>houstonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(houstonHandlers.isHoustonFinalWithoutStory(event))await houstonHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(houstonHandlers.isHoustonFinalWithoutStory).map(event=>houstonHandlers.attachArchiveStory(event)));return events;}}
  ,{school:iowaStateSchool,parseSchedule:(...args)=>iowaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>iowaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>iowaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>iowaStateHandlers.isCrossCountry(event),attach:event=>iowaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(iowaStateHandlers.isFinalWithoutStory(event))await iowaStateHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(iowaStateHandlers.isFinalWithoutStory).map(event=>iowaStateHandlers.attachArchiveStory(event)));return events;}}
  ,{school:tcuSchool,parseSchedule:(...args)=>tcuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tcuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tcuHandlers.matchesRecap(...args),crossCountry:{matches:event=>tcuHandlers.isCrossCountry(event),attach:event=>tcuHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tcuHandlers.isFinalWithoutStory(event))await tcuHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(tcuHandlers.isFinalWithoutStory).map(event=>tcuHandlers.attachArchiveStory(event)));return events;}}
  ,{school:texasTechSchool,parseSchedule:(...args)=>texasTechHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>texasTechHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>texasTechHandlers.matchesRecap(...args),crossCountry:{matches:event=>texasTechHandlers.isCrossCountry(event),attach:event=>texasTechHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(texasTechHandlers.isFinalWithoutStory(event))await texasTechHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(texasTechHandlers.isFinalWithoutStory).map(event=>texasTechHandlers.attachArchiveStory(event)));return events;}}
  ,{school:westVirginiaSchool,parseSchedule:(...args)=>westVirginiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westVirginiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westVirginiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>westVirginiaHandlers.isCrossCountry(event),attach:event=>westVirginiaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westVirginiaHandlers.isFinalWithoutStory(event))await westVirginiaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(westVirginiaHandlers.isFinalWithoutStory).map(event=>westVirginiaHandlers.attachArchiveStory(event)));return events;}}
  ,{school:alabamaSchool,parseSchedule:(...args)=>alabamaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>alabamaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>alabamaHandlers.matchesRecap(...args),crossCountry:{matches:event=>alabamaHandlers.isCrossCountry(event),attach:event=>alabamaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(alabamaHandlers.isFinalWithoutStory(event))await alabamaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(alabamaHandlers.isFinalWithoutStory).map(event=>alabamaHandlers.attachArchiveStory(event)));return events;}}
  ,{school:floridaSchool,parseSchedule:(...args)=>floridaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>floridaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>floridaHandlers.matchesRecap(...args),crossCountry:{matches:event=>floridaHandlers.isCrossCountry(event),attach:event=>floridaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(floridaHandlers.isFinalWithoutStory(event))await floridaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(floridaHandlers.isFinalWithoutStory).map(event=>floridaHandlers.attachArchiveStory(event)));return events.filter(event=>!floridaHandlers.isTennisWithoutStory(event));}}
  ,{school:georgiaSchool,parseSchedule:(...args)=>georgiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>georgiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>georgiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>georgiaHandlers.isCrossCountry(event),attach:event=>georgiaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(georgiaHandlers.isFinalWithoutStory(event))await georgiaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(georgiaHandlers.isFinalWithoutStory).map(event=>georgiaHandlers.attachArchiveStory(event)));return events.filter(event=>!georgiaHandlers.isTennisWithoutStory(event));}}
  ,{school:lsuSchool,parseSchedule:(...args)=>lsuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lsuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lsuHandlers.matchesRecap(...args),crossCountry:{matches:event=>lsuHandlers.isCrossCountry(event),attach:event=>lsuHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>lsuHandlers.isLsuGolf(event),attach:event=>lsuHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{if(sport==='Golf')await Promise.all(events.filter(lsuHandlers.isLsuGolf).map(event=>lsuHandlers.attachGolfPlace(event)));return events;}}
  ,{school:oleMissSchool,parseSchedule:(...args)=>oleMissHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>oleMissHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>oleMissHandlers.matchesRecap(...args),crossCountry:{matches:event=>oleMissHandlers.isCrossCountry(event),attach:event=>oleMissHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(oleMissHandlers.isFinalWithoutStory(event))await oleMissHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(oleMissHandlers.isFinalWithoutStory).map(event=>oleMissHandlers.attachArchiveStory(event)));return events.filter(event=>!oleMissHandlers.isTennisWithoutStory(event));}}
  ,{school:mississippiStateSchool,parseSchedule:(...args)=>mississippiStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mississippiStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mississippiStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>mississippiStateHandlers.isCrossCountry(event),attach:event=>mississippiStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mississippiStateHandlers.isFinalWithoutStory(event))await mississippiStateHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(mississippiStateHandlers.isFinalWithoutStory).map(event=>mississippiStateHandlers.attachArchiveStory(event)));return events.filter(event=>!mississippiStateHandlers.isTennisWithoutStory(event));}}
  ,{school:tennesseeSchool,parseSchedule:(...args)=>tennesseeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tennesseeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tennesseeHandlers.matchesRecap(...args),crossCountry:{matches:event=>tennesseeHandlers.isCrossCountry(event),attach:event=>tennesseeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tennesseeHandlers.isFinalWithoutStory(event))await tennesseeHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(tennesseeHandlers.isFinalWithoutStory).map(event=>tennesseeHandlers.attachArchiveStory(event)));return events.filter(event=>!tennesseeHandlers.isTennisWithoutStory(event));}}
  ,{school:missouriSchool,parseSchedule:(...args)=>missouriHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>missouriHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>missouriHandlers.matchesRecap(...args),crossCountry:{matches:event=>missouriHandlers.isCrossCountry(event),attach:event=>missouriHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>missouriHandlers.isMissouriGolf(event),attach:event=>missouriHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(missouriHandlers.isFinalWithoutStory(event))await missouriHandlers.attachArchiveStory(event);},
    feed:async(events,sport)=>{await Promise.all(events.filter(missouriHandlers.isFinalWithoutStory).map(event=>missouriHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(missouriHandlers.isMissouriGolf).map(event=>missouriHandlers.attachGolfPlace(event)));return events;}}
  ,{school:texasSchool,parseSchedule:(...args)=>texasHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>texasHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>texasHandlers.matchesRecap(...args),crossCountry:{matches:event=>texasHandlers.isCrossCountry(event),attach:event=>texasHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(texasHandlers.isFinalWithoutStory(event))await texasHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(texasHandlers.isFinalWithoutStory).map(event=>texasHandlers.attachArchiveStory(event)));return events.filter(event=>!texasHandlers.isTennisWithoutStory(event));}}
  ,{school:texasAmSchool,parseSchedule:(...args)=>texasAmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>texasAmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>texasAmHandlers.matchesRecap(...args),crossCountry:{matches:event=>texasAmHandlers.isCrossCountry(event),attach:event=>texasAmHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>texasAmHandlers.isTexasAmGolf(event),attach:event=>texasAmHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(texasAmHandlers.isFinalWithoutStory(event))await texasAmHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(texasAmHandlers.isFinalWithoutStory).map(event=>texasAmHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(texasAmHandlers.isTexasAmGolf).map(event=>texasAmHandlers.attachGolfPlace(event)));return events.filter(event=>!texasAmHandlers.isGolfWithoutStory(event));}}
  ,{school:arkansasSchool,parseSchedule:(...args)=>arkansasHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>arkansasHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>arkansasHandlers.matchesRecap(...args),crossCountry:{matches:event=>arkansasHandlers.isCrossCountry(event),attach:event=>arkansasHandlers.attachMeetResults(event)},
    // A final whose card links no story takes the team archive's.
    beforeHighlights:async event=>{if(arkansasHandlers.isFinalWithoutStory(event))await arkansasHandlers.attachArchiveStory(event);},
    // A past tournament still without a place or a story is not listed.
    feed:async events=>{await Promise.all(events.filter(arkansasHandlers.isFinalWithoutStory).map(event=>arkansasHandlers.attachArchiveStory(event)));return events.filter(event=>!arkansasHandlers.isUnlisted(event));}}
  ,{school:auburnSchool,parseSchedule:(...args)=>auburnHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>auburnHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>auburnHandlers.matchesRecap(...args),crossCountry:{matches:event=>auburnHandlers.isCrossCountry(event),attach:event=>auburnHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>auburnHandlers.isAuburnGolf(event),attach:event=>auburnHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(auburnHandlers.isFinalWithoutStory(event))await auburnHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(auburnHandlers.isFinalWithoutStory).map(event=>auburnHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(auburnHandlers.isAuburnGolf).map(event=>auburnHandlers.attachGolfPlace(event)));return events.filter(event=>!auburnHandlers.isGolfWithoutStory(event));}}
  ,{school:oklahomaSchool,parseSchedule:(...args)=>oklahomaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>oklahomaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>oklahomaHandlers.matchesRecap(...args),crossCountry:{matches:event=>oklahomaHandlers.isCrossCountry(event),attach:event=>oklahomaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(oklahomaHandlers.isFinalWithoutStory(event))await oklahomaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(oklahomaHandlers.isFinalWithoutStory).map(event=>oklahomaHandlers.attachArchiveStory(event)));return events;}}
  ,{school:kentuckySchool,parseSchedule:(...args)=>kentuckyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>kentuckyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>kentuckyHandlers.matchesRecap(...args),crossCountry:{matches:event=>kentuckyHandlers.isCrossCountry(event),attach:event=>kentuckyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(kentuckyHandlers.isFinalWithoutStory(event))await kentuckyHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(kentuckyHandlers.isFinalWithoutStory).map(event=>kentuckyHandlers.attachArchiveStory(event)));return events.filter(event=>!kentuckyHandlers.isUnlisted(event));}}
  ,{school:southCarolinaSchool,parseSchedule:(...args)=>southCarolinaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southCarolinaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southCarolinaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southCarolinaHandlers.isCrossCountry(event),attach:event=>southCarolinaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southCarolinaHandlers.isFinalWithoutStory(event))await southCarolinaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(southCarolinaHandlers.isFinalWithoutStory).map(event=>southCarolinaHandlers.attachArchiveStory(event)));return events.filter(event=>!southCarolinaHandlers.isUnlisted(event));}}
  ,{school:vanderbiltSchool,parseSchedule:(...args)=>vanderbiltHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>vanderbiltHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>vanderbiltHandlers.matchesRecap(...args),crossCountry:{matches:event=>vanderbiltHandlers.isCrossCountry(event),attach:event=>vanderbiltHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>vanderbiltHandlers.isVanderbiltGolf(event),attach:event=>vanderbiltHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(vanderbiltHandlers.isFinalWithoutStory(event))await vanderbiltHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(vanderbiltHandlers.isFinalWithoutStory).map(event=>vanderbiltHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(vanderbiltHandlers.isVanderbiltGolf).map(event=>vanderbiltHandlers.attachGolfPlace(event)));return events.filter(event=>!vanderbiltHandlers.isGolfWithoutStory(event));}}
  ,{school:illinoisSchool,parseSchedule:(...args)=>illinoisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>illinoisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>illinoisHandlers.matchesRecap(...args),crossCountry:{matches:event=>illinoisHandlers.isCrossCountry(event),attach:event=>illinoisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(illinoisHandlers.isFinalWithoutStory(event))await illinoisHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(illinoisHandlers.isFinalWithoutStory).map(event=>illinoisHandlers.attachArchiveStory(event)));return events.filter(event=>!illinoisHandlers.isTennisWithoutStory(event));}}
  ,{school:indianaSchool,parseSchedule:(...args)=>indianaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>indianaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>indianaHandlers.matchesRecap(...args),crossCountry:{matches:event=>indianaHandlers.isCrossCountry(event),attach:event=>indianaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(indianaHandlers.isFinalWithoutStory(event))await indianaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(indianaHandlers.isFinalWithoutStory).map(event=>indianaHandlers.attachArchiveStory(event)));return events.filter(event=>!indianaHandlers.isTennisWithoutStory(event));}}
  ,{school:iowaSchool,parseSchedule:(...args)=>iowaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>iowaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>iowaHandlers.matchesRecap(...args),crossCountry:{matches:event=>iowaHandlers.isCrossCountry(event),attach:event=>iowaHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>iowaHandlers.isIowaGolf(event),attach:event=>iowaHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(iowaHandlers.isFinalWithoutStory(event))await iowaHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(iowaHandlers.isFinalWithoutStory).map(event=>iowaHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(iowaHandlers.isIowaGolf).map(event=>iowaHandlers.attachGolfPlace(event)));return events.filter(event=>!iowaHandlers.isGolfWithoutStory(event));}}
  ,{school:marylandSchool,parseSchedule:(...args)=>marylandHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>marylandHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>marylandHandlers.matchesRecap(...args),crossCountry:{matches:event=>marylandHandlers.isCrossCountry(event),attach:event=>marylandHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(marylandHandlers.isFinalWithoutStory(event))await marylandHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(marylandHandlers.isFinalWithoutStory).map(event=>marylandHandlers.attachArchiveStory(event)));return events.filter(event=>!marylandHandlers.isTennisWithoutStory(event)&&!marylandHandlers.isGolfWithoutStory(event));}}
  ,{school:michiganSchool,parseSchedule:(...args)=>michiganHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>michiganHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>michiganHandlers.matchesRecap(...args),crossCountry:{matches:event=>michiganHandlers.isCrossCountry(event),attach:event=>michiganHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(michiganHandlers.isFinalWithoutStory(event))await michiganHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(michiganHandlers.isFinalWithoutStory).map(event=>michiganHandlers.attachArchiveStory(event)));return events.filter(event=>!michiganHandlers.isTennisWithoutStory(event)&&!michiganHandlers.isGolfWithoutStory(event));}}
  ,{school:michiganStateSchool,parseSchedule:(...args)=>michiganStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>michiganStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>michiganStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>michiganStateHandlers.isCrossCountry(event),attach:event=>michiganStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(michiganStateHandlers.isFinalWithoutStory(event))await michiganStateHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(michiganStateHandlers.isFinalWithoutStory).map(event=>michiganStateHandlers.attachArchiveStory(event)));return events.filter(event=>!michiganStateHandlers.isTennisWithoutStory(event)&&!michiganStateHandlers.isGolfWithoutStory(event));}}
  ,{school:nebraskaSchool,parseSchedule:(...args)=>nebraskaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>nebraskaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>nebraskaHandlers.matchesRecap(...args),crossCountry:{matches:event=>nebraskaHandlers.isCrossCountry(event),attach:event=>nebraskaHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>nebraskaHandlers.isNebraskaGolf(event),attach:event=>nebraskaHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(nebraskaHandlers.isFinalWithoutStory(event))await nebraskaHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(nebraskaHandlers.isFinalWithoutStory).map(event=>nebraskaHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(nebraskaHandlers.isNebraskaGolf).map(event=>nebraskaHandlers.attachGolfPlace(event)));return events.filter(event=>!nebraskaHandlers.isTournamentWithoutStory(event));}}
  ,{school:minnesotaSchool,parseSchedule:(...args)=>minnesotaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>minnesotaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>minnesotaHandlers.matchesRecap(...args),crossCountry:{matches:event=>minnesotaHandlers.isCrossCountry(event),attach:event=>minnesotaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(minnesotaHandlers.isFinalWithoutStory(event))await minnesotaHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(minnesotaHandlers.isFinalWithoutStory).map(event=>minnesotaHandlers.attachArchiveStory(event)));return events.filter(event=>!minnesotaHandlers.isTennisWithoutStory(event)&&!minnesotaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northwesternSchool,parseSchedule:(...args)=>northwesternHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northwesternHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northwesternHandlers.matchesRecap(...args),crossCountry:{matches:event=>northwesternHandlers.isCrossCountry(event),attach:event=>northwesternHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>northwesternHandlers.isNorthwesternGolf(event),attach:event=>northwesternHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(northwesternHandlers.isFinalWithoutStory(event))await northwesternHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(northwesternHandlers.isFinalWithoutStory).map(event=>northwesternHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(northwesternHandlers.isNorthwesternGolf).map(event=>northwesternHandlers.attachGolfPlace(event)));return events.filter(event=>!northwesternHandlers.isGolfWithoutStory(event));}}
  ,{school:ohioStateSchool,parseSchedule:(...args)=>ohioStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ohioStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ohioStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>ohioStateHandlers.isCrossCountry(event),attach:event=>ohioStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ohioStateHandlers.isFinalWithoutStory(event))await ohioStateHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(ohioStateHandlers.isFinalWithoutStory).map(event=>ohioStateHandlers.attachArchiveStory(event)));return events.filter(event=>!ohioStateHandlers.isTennisWithoutStory(event)&&!ohioStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:oregonSchool,parseSchedule:(...args)=>oregonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>oregonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>oregonHandlers.matchesRecap(...args),crossCountry:{matches:event=>oregonHandlers.isCrossCountry(event),attach:event=>oregonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(oregonHandlers.isFinalWithoutStory(event))await oregonHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(oregonHandlers.isFinalWithoutStory).map(event=>oregonHandlers.attachArchiveStory(event)));return events.filter(event=>!oregonHandlers.isTennisWithoutStory(event)&&!oregonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:pennStateSchool,parseSchedule:(...args)=>pennStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>pennStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>pennStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>pennStateHandlers.isCrossCountry(event),attach:event=>pennStateHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>pennStateHandlers.isPennStateGolf(event),attach:event=>pennStateHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(pennStateHandlers.isFinalWithoutStory(event))await pennStateHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(pennStateHandlers.isFinalWithoutStory).map(event=>pennStateHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(pennStateHandlers.isPennStateGolf).map(event=>pennStateHandlers.attachGolfPlace(event)));return events.filter(event=>!pennStateHandlers.isTournamentWithoutStory(event));}}
  ,{school:purdueSchool,parseSchedule:(...args)=>purdueHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>purdueHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>purdueHandlers.matchesRecap(...args),crossCountry:{matches:event=>purdueHandlers.isCrossCountry(event),attach:event=>purdueHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>purdueHandlers.isPurdueGolf(event),attach:event=>purdueHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(purdueHandlers.isFinalWithoutStory(event))await purdueHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(purdueHandlers.isFinalWithoutStory).map(event=>purdueHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(purdueHandlers.isPurdueGolf).map(event=>purdueHandlers.attachGolfPlace(event)));return events.filter(event=>!purdueHandlers.isTournamentWithoutStory(event));}}
  ,{school:rutgersSchool,parseSchedule:(...args)=>rutgersHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>rutgersHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>rutgersHandlers.matchesRecap(...args),crossCountry:{matches:event=>rutgersHandlers.isCrossCountry(event),attach:event=>rutgersHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story.
    results:[{matches:event=>rutgersHandlers.isRutgersGolf(event),attach:event=>rutgersHandlers.attachGolfPlace(event)}],
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(rutgersHandlers.isFinalWithoutStory(event))await rutgersHandlers.attachArchiveStory(event);},
    feed:async(events,sport)=>{await Promise.all(events.filter(rutgersHandlers.isFinalWithoutStory).map(event=>rutgersHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(rutgersHandlers.isRutgersGolf).map(event=>rutgersHandlers.attachGolfPlace(event)));return events.filter(event=>!rutgersHandlers.isTennisWithoutStory(event)&&!rutgersHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uclaSchool,parseSchedule:(...args)=>uclaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uclaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uclaHandlers.matchesRecap(...args),crossCountry:{matches:event=>uclaHandlers.isCrossCountry(event),attach:event=>uclaHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>uclaHandlers.isUclaGolf(event),attach:event=>uclaHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(uclaHandlers.isFinalWithoutStory(event))await uclaHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(uclaHandlers.isFinalWithoutStory).map(event=>uclaHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(uclaHandlers.isUclaGolf).map(event=>uclaHandlers.attachGolfPlace(event)));return events.filter(event=>!uclaHandlers.isTournamentWithoutStory(event));}}
  ,{school:uscSchool,parseSchedule:(...args)=>uscHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uscHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uscHandlers.matchesRecap(...args),crossCountry:{matches:event=>uscHandlers.isCrossCountry(event),attach:event=>uscHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>uscHandlers.isUscGolf(event),attach:event=>uscHandlers.attachGolfPlace(event)}],
    beforeHighlights:async event=>{if(uscHandlers.isFinalWithoutStory(event))await uscHandlers.attachArchiveStory(event);},
    feed:async(events,sport)=>{await Promise.all(events.filter(uscHandlers.isFinalWithoutStory).map(event=>uscHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(uscHandlers.isUscGolf).map(event=>uscHandlers.attachGolfPlace(event)));return events.filter(event=>!uscHandlers.isTennisWithoutStory(event)&&!uscHandlers.isGolfWithoutStory?.(event));}}
  ,{school:washingtonSchool,parseSchedule:(...args)=>washingtonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>washingtonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>washingtonHandlers.matchesRecap(...args),crossCountry:{matches:event=>washingtonHandlers.isCrossCountry(event),attach:event=>washingtonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(washingtonHandlers.isFinalWithoutStory(event))await washingtonHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(washingtonHandlers.isFinalWithoutStory).map(event=>washingtonHandlers.attachArchiveStory(event)));return events.filter(event=>!washingtonHandlers.isTennisWithoutStory(event)&&!washingtonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:wisconsinSchool,parseSchedule:(...args)=>wisconsinHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>wisconsinHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>wisconsinHandlers.matchesRecap(...args),crossCountry:{matches:event=>wisconsinHandlers.isCrossCountry(event),attach:event=>wisconsinHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(wisconsinHandlers.isFinalWithoutStory(event))await wisconsinHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(wisconsinHandlers.isFinalWithoutStory).map(event=>wisconsinHandlers.attachArchiveStory(event)));return events.filter(event=>!wisconsinHandlers.isTennisWithoutStory(event)&&!wisconsinHandlers.isGolfWithoutStory?.(event));}}
  ,{school:miamiSchool,parseSchedule:(...args)=>miamiHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>miamiHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>miamiHandlers.matchesRecap(...args),crossCountry:{matches:event=>miamiHandlers.isCrossCountry(event),attach:event=>miamiHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>miamiHandlers.isMiamiGolf(event),attach:event=>miamiHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(miamiHandlers.isFinalWithoutStory(event))await miamiHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(miamiHandlers.isFinalWithoutStory).map(event=>miamiHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(miamiHandlers.isMiamiGolf).map(event=>miamiHandlers.attachGolfPlace(event)));return events.filter(event=>!miamiHandlers.isTournamentWithoutStory(event));}}
  ,{school:virginiaSchool,parseSchedule:(...args)=>virginiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>virginiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>virginiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>virginiaHandlers.isCrossCountry(event),attach:event=>virginiaHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>virginiaHandlers.isVirginiaGolf(event),attach:event=>virginiaHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(virginiaHandlers.isFinalWithoutStory(event))await virginiaHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(virginiaHandlers.isFinalWithoutStory).map(event=>virginiaHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(virginiaHandlers.isVirginiaGolf).map(event=>virginiaHandlers.attachGolfPlace(event)));return events.filter(event=>!virginiaHandlers.isTournamentWithoutStory(event));}}
  ,{school:bostonCollegeSchool,parseSchedule:(...args)=>bostonCollegeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bostonCollegeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bostonCollegeHandlers.matchesRecap(...args),crossCountry:{matches:event=>bostonCollegeHandlers.isCrossCountry(event),attach:event=>bostonCollegeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bostonCollegeHandlers.isFinalWithoutStory(event))await bostonCollegeHandlers.attachArchiveStory(event);},
    feed:async events=>{await Promise.all(events.filter(bostonCollegeHandlers.isFinalWithoutStory).map(event=>bostonCollegeHandlers.attachArchiveStory(event)));return events.filter(event=>!bostonCollegeHandlers.isTennisWithoutStory(event)&&!bostonCollegeHandlers.isGolfWithoutStory?.(event));}}
  ,{school:californiaSchool,parseSchedule:(...args)=>californiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>californiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>californiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>californiaHandlers.isCrossCountry(event),attach:event=>californiaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    results:[{matches:event=>californiaHandlers.isCaliforniaGolf(event),attach:event=>californiaHandlers.attachGolfPlace(event)}],
    beforeHighlights:async event=>{if(californiaHandlers.isFinalWithoutStory(event))await californiaHandlers.attachArchiveStory(event);},
    feed:async(events,sport)=>{await Promise.all(events.filter(californiaHandlers.isFinalWithoutStory).map(event=>californiaHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(californiaHandlers.isCaliforniaGolf).map(event=>californiaHandlers.attachGolfPlace(event)));return events.filter(event=>!californiaHandlers.isTennisWithoutStory(event)&&!californiaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:clemsonSchool,parseSchedule:(...args)=>clemsonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>clemsonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>clemsonHandlers.matchesRecap(...args),crossCountry:{matches:event=>clemsonHandlers.isCrossCountry(event),attach:event=>clemsonHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>clemsonHandlers.isClemsonGolf(event),attach:event=>clemsonHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(clemsonHandlers.isFinalWithoutStory(event))await clemsonHandlers.attachArchiveStory(event);},
    // A past golf tournament still without a story publishes no place: it is
    // not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(clemsonHandlers.isFinalWithoutStory).map(event=>clemsonHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(clemsonHandlers.isClemsonGolf).map(event=>clemsonHandlers.attachGolfPlace(event)));return events.filter(event=>!clemsonHandlers.isGolfWithoutStory(event));}}
  ,{school:dukeSchool,parseSchedule:(...args)=>dukeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>dukeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>dukeHandlers.matchesRecap(...args),crossCountry:{matches:event=>dukeHandlers.isCrossCountry(event),attach:event=>dukeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(dukeHandlers.isFinalWithoutStory(event))await dukeHandlers.attachArchiveStory(event);},
    results:[{matches:event=>dukeHandlers.isDukeGolf(event),attach:event=>dukeHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(dukeHandlers.isFinalWithoutStory).map(event=>dukeHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(dukeHandlers.isDukeGolf).map(event=>dukeHandlers.attachGolfPlace(event)));return events.filter(event=>!dukeHandlers.isTennisWithoutStory(event)&&!dukeHandlers.isGolfWithoutStory?.(event));}}
  ,{school:floridaStateSchool,parseSchedule:(...args)=>floridaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>floridaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>floridaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>floridaStateHandlers.isCrossCountry(event),attach:event=>floridaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(floridaStateHandlers.isFinalWithoutStory(event))await floridaStateHandlers.attachArchiveStory(event);},
    results:[{matches:event=>floridaStateHandlers.isFloridaStateGolf(event),attach:event=>floridaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(floridaStateHandlers.isFinalWithoutStory).map(event=>floridaStateHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(floridaStateHandlers.isFloridaStateGolf).map(event=>floridaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!floridaStateHandlers.isTennisWithoutStory(event)&&!floridaStateHandlers.isGolfWithoutStory(event));}}
  ,{school:georgiaTechSchool,parseSchedule:(...args)=>georgiaTechHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>georgiaTechHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>georgiaTechHandlers.matchesRecap(...args),crossCountry:{matches:event=>georgiaTechHandlers.isCrossCountry(event),attach:event=>georgiaTechHandlers.attachMeetResults(event)},
    // Golf's team place comes from the final story's headline.
    results:[{matches:event=>georgiaTechHandlers.isGeorgiaTechGolf(event),attach:event=>georgiaTechHandlers.attachGolfPlace(event)}],
    // A final whose card links no story takes the archive's.
    beforeHighlights:async event=>{if(georgiaTechHandlers.isFinalWithoutStory(event))await georgiaTechHandlers.attachArchiveStory(event);},
    // A past golf or tennis tournament still without a story publishes no
    // place: it is not listed.
    feed:async(events,sport)=>{await Promise.all(events.filter(georgiaTechHandlers.isFinalWithoutStory).map(event=>georgiaTechHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(georgiaTechHandlers.isGeorgiaTechGolf).map(event=>georgiaTechHandlers.attachGolfPlace(event)));return events.filter(event=>!georgiaTechHandlers.isTournamentWithoutStory(event));}}
  ,{school:louisvilleSchool,parseSchedule:(...args)=>louisvilleHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>louisvilleHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>louisvilleHandlers.matchesRecap(...args),crossCountry:{matches:event=>louisvilleHandlers.isCrossCountry(event),attach:event=>louisvilleHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(louisvilleHandlers.isFinalWithoutStory(event))await louisvilleHandlers.attachArchiveStory(event);},
    results:[{matches:event=>louisvilleHandlers.isGolfAwaitingPlace(event),attach:event=>louisvilleHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(louisvilleHandlers.isFinalWithoutStory).map(event=>louisvilleHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(louisvilleHandlers.isGolfAwaitingPlace).map(event=>louisvilleHandlers.attachGolfPlace(event)));return events.filter(event=>!louisvilleHandlers.isTennisWithoutStory(event)&&!louisvilleHandlers.isGolfWithoutStory(event));}}
  ,{school:ncStateSchool,parseSchedule:(...args)=>ncStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ncStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ncStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>ncStateHandlers.isCrossCountry(event),attach:event=>ncStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ncStateHandlers.isFinalWithoutStory(event))await ncStateHandlers.attachArchiveStory(event);},
    results:[{matches:event=>ncStateHandlers.isGolfAwaitingPlace(event),attach:event=>ncStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ncStateHandlers.isFinalWithoutStory).map(event=>ncStateHandlers.attachArchiveStory(event)));if(sport==='Golf')await Promise.all(events.filter(ncStateHandlers.isGolfAwaitingPlace).map(event=>ncStateHandlers.attachGolfPlace(event)));return events.filter(event=>!ncStateHandlers.isTennisWithoutStory(event)&&!ncStateHandlers.isGolfWithoutStory(event));}}
  ,{school:northCarolinaSchool,parseSchedule:(...args)=>northCarolinaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northCarolinaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northCarolinaHandlers.matchesRecap(...args),crossCountry:{matches:event=>northCarolinaHandlers.isCrossCountry(event),attach:event=>northCarolinaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northCarolinaHandlers.isFinalWithoutStory(event))await northCarolinaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northCarolinaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northCarolinaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northCarolinaHandlers.isFinalWithoutStory).map(event=>northCarolinaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northCarolinaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northCarolinaHandlers.isGolfAwaitingPlace).map(event=>northCarolinaHandlers.attachGolfPlace(event)));return events.filter(event=>!northCarolinaHandlers.isTennisWithoutStory(event)&&!northCarolinaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:notreDameSchool,parseSchedule:(...args)=>notreDameHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>notreDameHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>notreDameHandlers.matchesRecap(...args),crossCountry:{matches:event=>notreDameHandlers.isCrossCountry(event),attach:event=>notreDameHandlers.attachMeetResults(event)}}
  ,{school:pittSchool,parseSchedule:(...args)=>pittHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>pittHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>pittHandlers.matchesRecap(...args),crossCountry:{matches:event=>pittHandlers.isCrossCountry(event),attach:event=>pittHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(pittHandlers.isFinalWithoutStory(event))await pittHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>pittHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>pittHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(pittHandlers.isFinalWithoutStory).map(event=>pittHandlers.attachArchiveStory(event)));if(sport==='Golf'&&pittHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(pittHandlers.isGolfAwaitingPlace).map(event=>pittHandlers.attachGolfPlace(event)));return events.filter(event=>!pittHandlers.isTennisWithoutStory(event)&&!pittHandlers.isGolfWithoutStory?.(event));}}
  ,{school:smuSchool,parseSchedule:(...args)=>smuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>smuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>smuHandlers.matchesRecap(...args),crossCountry:{matches:event=>smuHandlers.isCrossCountry(event),attach:event=>smuHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(smuHandlers.isFinalWithoutStory(event))await smuHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>smuHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>smuHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(smuHandlers.isFinalWithoutStory).map(event=>smuHandlers.attachArchiveStory(event)));if(sport==='Golf'&&smuHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(smuHandlers.isGolfAwaitingPlace).map(event=>smuHandlers.attachGolfPlace(event)));return events.filter(event=>!smuHandlers.isTennisWithoutStory(event)&&!smuHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stanfordSchool,parseSchedule:(...args)=>stanfordHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stanfordHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stanfordHandlers.matchesRecap(...args),crossCountry:{matches:event=>stanfordHandlers.isCrossCountry(event),attach:event=>stanfordHandlers.attachMeetResults(event)}}
  ,{school:syracuseSchool,parseSchedule:(...args)=>syracuseHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>syracuseHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>syracuseHandlers.matchesRecap(...args),crossCountry:{matches:event=>syracuseHandlers.isCrossCountry(event),attach:event=>syracuseHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(syracuseHandlers.isFinalWithoutStory(event))await syracuseHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>syracuseHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>syracuseHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(syracuseHandlers.isFinalWithoutStory).map(event=>syracuseHandlers.attachArchiveStory(event)));if(sport==='Golf'&&syracuseHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(syracuseHandlers.isGolfAwaitingPlace).map(event=>syracuseHandlers.attachGolfPlace(event)));return events.filter(event=>!syracuseHandlers.isTennisWithoutStory(event)&&!syracuseHandlers.isGolfWithoutStory?.(event));}}
  ,{school:wakeForestSchool,parseSchedule:(...args)=>wakeForestHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>wakeForestHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>wakeForestHandlers.matchesRecap(...args),crossCountry:{matches:event=>wakeForestHandlers.isCrossCountry(event),attach:event=>wakeForestHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(wakeForestHandlers.isFinalWithoutStory(event))await wakeForestHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>wakeForestHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>wakeForestHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(wakeForestHandlers.isFinalWithoutStory).map(event=>wakeForestHandlers.attachArchiveStory(event)));if(sport==='Golf'&&wakeForestHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(wakeForestHandlers.isGolfAwaitingPlace).map(event=>wakeForestHandlers.attachGolfPlace(event)));return events.filter(event=>!wakeForestHandlers.isTennisWithoutStory(event)&&!wakeForestHandlers.isGolfWithoutStory?.(event));}}
  ,{school:virginiaTechSchool,parseSchedule:(...args)=>virginiaTechHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>virginiaTechHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>virginiaTechHandlers.matchesRecap(...args),crossCountry:{matches:event=>virginiaTechHandlers.isCrossCountry(event),attach:event=>virginiaTechHandlers.attachMeetResults(event)}}
  ,{school:boiseStateSchool,parseSchedule:(...args)=>boiseStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>boiseStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>boiseStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>boiseStateHandlers.isCrossCountry(event),attach:event=>boiseStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(boiseStateHandlers.isFinalWithoutStory(event))await boiseStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>boiseStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>boiseStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(boiseStateHandlers.isFinalWithoutStory).map(event=>boiseStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&boiseStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(boiseStateHandlers.isGolfAwaitingPlace).map(event=>boiseStateHandlers.attachGolfPlace(event)));return events.filter(event=>!boiseStateHandlers.isTennisWithoutStory(event)&&!boiseStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:coloradoStateSchool,parseSchedule:(...args)=>coloradoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>coloradoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>coloradoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>coloradoStateHandlers.isCrossCountry(event),attach:event=>coloradoStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(coloradoStateHandlers.isFinalWithoutStory(event))await coloradoStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>coloradoStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>coloradoStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(coloradoStateHandlers.isFinalWithoutStory).map(event=>coloradoStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&coloradoStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(coloradoStateHandlers.isGolfAwaitingPlace).map(event=>coloradoStateHandlers.attachGolfPlace(event)));return events.filter(event=>!coloradoStateHandlers.isTennisWithoutStory(event)&&!coloradoStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:fresnoStateSchool,parseSchedule:(...args)=>fresnoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>fresnoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>fresnoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>fresnoStateHandlers.isCrossCountry(event),attach:event=>fresnoStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(fresnoStateHandlers.isFinalWithoutStory(event))await fresnoStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>fresnoStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>fresnoStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(fresnoStateHandlers.isFinalWithoutStory).map(event=>fresnoStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&fresnoStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(fresnoStateHandlers.isGolfAwaitingPlace).map(event=>fresnoStateHandlers.attachGolfPlace(event)));return events.filter(event=>!fresnoStateHandlers.isTennisWithoutStory(event)&&!fresnoStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:gonzagaSchool,parseSchedule:(...args)=>gonzagaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>gonzagaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>gonzagaHandlers.matchesRecap(...args),crossCountry:{matches:event=>gonzagaHandlers.isCrossCountry(event),attach:event=>gonzagaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(gonzagaHandlers.isFinalWithoutStory(event))await gonzagaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>gonzagaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>gonzagaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(gonzagaHandlers.isFinalWithoutStory).map(event=>gonzagaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&gonzagaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(gonzagaHandlers.isGolfAwaitingPlace).map(event=>gonzagaHandlers.attachGolfPlace(event)));return events.filter(event=>!gonzagaHandlers.isTennisWithoutStory(event)&&!gonzagaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:oregonStateSchool,parseSchedule:(...args)=>oregonStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>oregonStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>oregonStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>oregonStateHandlers.isCrossCountry(event),attach:event=>oregonStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(oregonStateHandlers.isFinalWithoutStory(event))await oregonStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>oregonStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>oregonStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(oregonStateHandlers.isFinalWithoutStory).map(event=>oregonStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&oregonStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(oregonStateHandlers.isGolfAwaitingPlace).map(event=>oregonStateHandlers.attachGolfPlace(event)));return events.filter(event=>!oregonStateHandlers.isTennisWithoutStory(event)&&!oregonStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:sanDiegoStateSchool,parseSchedule:(...args)=>sanDiegoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sanDiegoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sanDiegoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>sanDiegoStateHandlers.isCrossCountry(event),attach:event=>sanDiegoStateHandlers.attachMeetResults(event)}}
  ,{school:washingtonStateSchool,parseSchedule:(...args)=>washingtonStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>washingtonStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>washingtonStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>washingtonStateHandlers.isCrossCountry(event),attach:event=>washingtonStateHandlers.attachMeetResults(event)}}
  ,{school:creightonSchool,parseSchedule:(...args)=>creightonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>creightonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>creightonHandlers.matchesRecap(...args),crossCountry:{matches:event=>creightonHandlers.isCrossCountry(event),attach:event=>creightonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(creightonHandlers.isFinalWithoutStory(event))await creightonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>creightonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>creightonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(creightonHandlers.isFinalWithoutStory).map(event=>creightonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&creightonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(creightonHandlers.isGolfAwaitingPlace).map(event=>creightonHandlers.attachGolfPlace(event)));return events.filter(event=>!creightonHandlers.isTennisWithoutStory(event)&&!creightonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:depaulSchool,parseSchedule:(...args)=>depaulHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>depaulHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>depaulHandlers.matchesRecap(...args),crossCountry:{matches:event=>depaulHandlers.isCrossCountry(event),attach:event=>depaulHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(depaulHandlers.isFinalWithoutStory(event))await depaulHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>depaulHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>depaulHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(depaulHandlers.isFinalWithoutStory).map(event=>depaulHandlers.attachArchiveStory(event)));if(sport==='Golf'&&depaulHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(depaulHandlers.isGolfAwaitingPlace).map(event=>depaulHandlers.attachGolfPlace(event)));return events.filter(event=>!depaulHandlers.isTennisWithoutStory(event)&&!depaulHandlers.isGolfWithoutStory?.(event));}}
  ,{school:marquetteSchool,parseSchedule:(...args)=>marquetteHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>marquetteHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>marquetteHandlers.matchesRecap(...args),crossCountry:{matches:event=>marquetteHandlers.isCrossCountry(event),attach:event=>marquetteHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(marquetteHandlers.isFinalWithoutStory(event))await marquetteHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>marquetteHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>marquetteHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(marquetteHandlers.isFinalWithoutStory).map(event=>marquetteHandlers.attachArchiveStory(event)));if(sport==='Golf'&&marquetteHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(marquetteHandlers.isGolfAwaitingPlace).map(event=>marquetteHandlers.attachGolfPlace(event)));return events.filter(event=>!marquetteHandlers.isTennisWithoutStory(event)&&!marquetteHandlers.isGolfWithoutStory?.(event));}}
  ,{school:providenceSchool,parseSchedule:(...args)=>providenceHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>providenceHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>providenceHandlers.matchesRecap(...args),crossCountry:{matches:event=>providenceHandlers.isCrossCountry(event),attach:event=>providenceHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(providenceHandlers.isFinalWithoutStory(event))await providenceHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>providenceHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>providenceHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(providenceHandlers.isFinalWithoutStory).map(event=>providenceHandlers.attachArchiveStory(event)));if(sport==='Golf'&&providenceHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(providenceHandlers.isGolfAwaitingPlace).map(event=>providenceHandlers.attachGolfPlace(event)));return events.filter(event=>!providenceHandlers.isTennisWithoutStory(event)&&!providenceHandlers.isGolfWithoutStory?.(event));}}
  ,{school:setonHallSchool,parseSchedule:(...args)=>setonHallHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>setonHallHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>setonHallHandlers.matchesRecap(...args),crossCountry:{matches:event=>setonHallHandlers.isCrossCountry(event),attach:event=>setonHallHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(setonHallHandlers.isFinalWithoutStory(event))await setonHallHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>setonHallHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>setonHallHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(setonHallHandlers.isFinalWithoutStory).map(event=>setonHallHandlers.attachArchiveStory(event)));if(sport==='Golf'&&setonHallHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(setonHallHandlers.isGolfAwaitingPlace).map(event=>setonHallHandlers.attachGolfPlace(event)));return events.filter(event=>!setonHallHandlers.isTennisWithoutStory(event)&&!setonHallHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stJohnsSchool,parseSchedule:(...args)=>stJohnsHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stJohnsHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stJohnsHandlers.matchesRecap(...args),crossCountry:{matches:event=>stJohnsHandlers.isCrossCountry(event),attach:event=>stJohnsHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(stJohnsHandlers.isFinalWithoutStory(event))await stJohnsHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>stJohnsHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>stJohnsHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(stJohnsHandlers.isFinalWithoutStory).map(event=>stJohnsHandlers.attachArchiveStory(event)));if(sport==='Golf'&&stJohnsHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(stJohnsHandlers.isGolfAwaitingPlace).map(event=>stJohnsHandlers.attachGolfPlace(event)));return events.filter(event=>!stJohnsHandlers.isTennisWithoutStory(event)&&!stJohnsHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uconnSchool,parseSchedule:(...args)=>uconnHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uconnHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uconnHandlers.matchesRecap(...args),crossCountry:{matches:event=>uconnHandlers.isCrossCountry(event),attach:event=>uconnHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(uconnHandlers.isFinalWithoutStory(event))await uconnHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>uconnHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>uconnHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(uconnHandlers.isFinalWithoutStory).map(event=>uconnHandlers.attachArchiveStory(event)));if(sport==='Golf'&&uconnHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(uconnHandlers.isGolfAwaitingPlace).map(event=>uconnHandlers.attachGolfPlace(event)));return events.filter(event=>!uconnHandlers.isTennisWithoutStory(event)&&!uconnHandlers.isGolfWithoutStory?.(event));}}
  ,{school:xavierSchool,parseSchedule:(...args)=>xavierHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>xavierHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>xavierHandlers.matchesRecap(...args),crossCountry:{matches:event=>xavierHandlers.isCrossCountry(event),attach:event=>xavierHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(xavierHandlers.isFinalWithoutStory(event))await xavierHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>xavierHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>xavierHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(xavierHandlers.isFinalWithoutStory).map(event=>xavierHandlers.attachArchiveStory(event)));if(sport==='Golf'&&xavierHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(xavierHandlers.isGolfAwaitingPlace).map(event=>xavierHandlers.attachGolfPlace(event)));return events.filter(event=>!xavierHandlers.isTennisWithoutStory(event)&&!xavierHandlers.isGolfWithoutStory?.(event));}}
  ,{school:montanaSchool,parseSchedule:(...args)=>montanaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>montanaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>montanaHandlers.matchesRecap(...args),crossCountry:{matches:event=>montanaHandlers.isCrossCountry(event),attach:event=>montanaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(montanaHandlers.isFinalWithoutStory(event))await montanaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>montanaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>montanaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(montanaHandlers.isFinalWithoutStory).map(event=>montanaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&montanaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(montanaHandlers.isGolfAwaitingPlace).map(event=>montanaHandlers.attachGolfPlace(event)));return events.filter(event=>!montanaHandlers.isTennisWithoutStory(event)&&!montanaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:montanaStateSchool,parseSchedule:(...args)=>montanaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>montanaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>montanaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>montanaStateHandlers.isCrossCountry(event),attach:event=>montanaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(montanaStateHandlers.isFinalWithoutStory(event))await montanaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>montanaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>montanaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(montanaStateHandlers.isFinalWithoutStory).map(event=>montanaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&montanaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(montanaStateHandlers.isGolfAwaitingPlace).map(event=>montanaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!montanaStateHandlers.isTennisWithoutStory(event)&&!montanaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:idahoStateSchool,parseSchedule:(...args)=>idahoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>idahoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>idahoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>idahoStateHandlers.isCrossCountry(event),attach:event=>idahoStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(idahoStateHandlers.isFinalWithoutStory(event))await idahoStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>idahoStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>idahoStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(idahoStateHandlers.isFinalWithoutStory).map(event=>idahoStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&idahoStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(idahoStateHandlers.isGolfAwaitingPlace).map(event=>idahoStateHandlers.attachGolfPlace(event)));return events.filter(event=>!idahoStateHandlers.isTennisWithoutStory(event)&&!idahoStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:easternWashingtonSchool,parseSchedule:(...args)=>easternWashingtonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>easternWashingtonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>easternWashingtonHandlers.matchesRecap(...args),crossCountry:{matches:event=>easternWashingtonHandlers.isCrossCountry(event),attach:event=>easternWashingtonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(easternWashingtonHandlers.isFinalWithoutStory(event))await easternWashingtonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>easternWashingtonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>easternWashingtonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(easternWashingtonHandlers.isFinalWithoutStory).map(event=>easternWashingtonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&easternWashingtonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(easternWashingtonHandlers.isGolfAwaitingPlace).map(event=>easternWashingtonHandlers.attachGolfPlace(event)));return events.filter(event=>!easternWashingtonHandlers.isTennisWithoutStory(event)&&!easternWashingtonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northernArizonaSchool,parseSchedule:(...args)=>northernArizonaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northernArizonaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northernArizonaHandlers.matchesRecap(...args),crossCountry:{matches:event=>northernArizonaHandlers.isCrossCountry(event),attach:event=>northernArizonaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northernArizonaHandlers.isFinalWithoutStory(event))await northernArizonaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northernArizonaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northernArizonaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northernArizonaHandlers.isFinalWithoutStory).map(event=>northernArizonaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northernArizonaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northernArizonaHandlers.isGolfAwaitingPlace).map(event=>northernArizonaHandlers.attachGolfPlace(event)));return events.filter(event=>!northernArizonaHandlers.isTennisWithoutStory(event)&&!northernArizonaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northernColoradoSchool,parseSchedule:(...args)=>northernColoradoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northernColoradoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northernColoradoHandlers.matchesRecap(...args),crossCountry:{matches:event=>northernColoradoHandlers.isCrossCountry(event),attach:event=>northernColoradoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northernColoradoHandlers.isFinalWithoutStory(event))await northernColoradoHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northernColoradoHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northernColoradoHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northernColoradoHandlers.isFinalWithoutStory).map(event=>northernColoradoHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northernColoradoHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northernColoradoHandlers.isGolfAwaitingPlace).map(event=>northernColoradoHandlers.attachGolfPlace(event)));return events.filter(event=>!northernColoradoHandlers.isTennisWithoutStory(event)&&!northernColoradoHandlers.isGolfWithoutStory?.(event));}}
  ,{school:portlandStateSchool,parseSchedule:(...args)=>portlandStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>portlandStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>portlandStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>portlandStateHandlers.isCrossCountry(event),attach:event=>portlandStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(portlandStateHandlers.isFinalWithoutStory(event))await portlandStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>portlandStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>portlandStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(portlandStateHandlers.isFinalWithoutStory).map(event=>portlandStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&portlandStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(portlandStateHandlers.isGolfAwaitingPlace).map(event=>portlandStateHandlers.attachGolfPlace(event)));return events.filter(event=>!portlandStateHandlers.isTennisWithoutStory(event)&&!portlandStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:weberStateSchool,parseSchedule:(...args)=>weberStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>weberStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>weberStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>weberStateHandlers.isCrossCountry(event),attach:event=>weberStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(weberStateHandlers.isFinalWithoutStory(event))await weberStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>weberStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>weberStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(weberStateHandlers.isFinalWithoutStory).map(event=>weberStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&weberStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(weberStateHandlers.isGolfAwaitingPlace).map(event=>weberStateHandlers.attachGolfPlace(event)));return events.filter(event=>!weberStateHandlers.isTennisWithoutStory(event)&&!weberStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southernUtahSchool,parseSchedule:(...args)=>southernUtahHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southernUtahHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southernUtahHandlers.matchesRecap(...args),crossCountry:{matches:event=>southernUtahHandlers.isCrossCountry(event),attach:event=>southernUtahHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southernUtahHandlers.isFinalWithoutStory(event))await southernUtahHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southernUtahHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southernUtahHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southernUtahHandlers.isFinalWithoutStory).map(event=>southernUtahHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southernUtahHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southernUtahHandlers.isGolfAwaitingPlace).map(event=>southernUtahHandlers.attachGolfPlace(event)));return events.filter(event=>!southernUtahHandlers.isTennisWithoutStory(event)&&!southernUtahHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utahTechSchool,parseSchedule:(...args)=>utahTechHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utahTechHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utahTechHandlers.matchesRecap(...args),crossCountry:{matches:event=>utahTechHandlers.isCrossCountry(event),attach:event=>utahTechHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utahTechHandlers.isFinalWithoutStory(event))await utahTechHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utahTechHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utahTechHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utahTechHandlers.isFinalWithoutStory).map(event=>utahTechHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utahTechHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utahTechHandlers.isGolfAwaitingPlace).map(event=>utahTechHandlers.attachGolfPlace(event)));return events.filter(event=>!utahTechHandlers.isTennisWithoutStory(event)&&!utahTechHandlers.isGolfWithoutStory?.(event));}}
  ,{school:arkansasStateSchool,parseSchedule:(...args)=>arkansasStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>arkansasStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>arkansasStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>arkansasStateHandlers.isCrossCountry(event),attach:event=>arkansasStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(arkansasStateHandlers.isFinalWithoutStory(event))await arkansasStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>arkansasStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>arkansasStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(arkansasStateHandlers.isFinalWithoutStory).map(event=>arkansasStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&arkansasStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(arkansasStateHandlers.isGolfAwaitingPlace).map(event=>arkansasStateHandlers.attachGolfPlace(event)));return events.filter(event=>!arkansasStateHandlers.isTennisWithoutStory(event)&&!arkansasStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:coastalCarolinaSchool,parseSchedule:(...args)=>coastalCarolinaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>coastalCarolinaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>coastalCarolinaHandlers.matchesRecap(...args),crossCountry:{matches:event=>coastalCarolinaHandlers.isCrossCountry(event),attach:event=>coastalCarolinaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(coastalCarolinaHandlers.isFinalWithoutStory(event))await coastalCarolinaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>coastalCarolinaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>coastalCarolinaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(coastalCarolinaHandlers.isFinalWithoutStory).map(event=>coastalCarolinaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&coastalCarolinaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(coastalCarolinaHandlers.isGolfAwaitingPlace).map(event=>coastalCarolinaHandlers.attachGolfPlace(event)));return events.filter(event=>!coastalCarolinaHandlers.isTennisWithoutStory(event)&&!coastalCarolinaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:georgiaSouthernSchool,parseSchedule:(...args)=>georgiaSouthernHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>georgiaSouthernHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>georgiaSouthernHandlers.matchesRecap(...args),crossCountry:{matches:event=>georgiaSouthernHandlers.isCrossCountry(event),attach:event=>georgiaSouthernHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(georgiaSouthernHandlers.isFinalWithoutStory(event))await georgiaSouthernHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>georgiaSouthernHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>georgiaSouthernHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(georgiaSouthernHandlers.isFinalWithoutStory).map(event=>georgiaSouthernHandlers.attachArchiveStory(event)));if(sport==='Golf'&&georgiaSouthernHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(georgiaSouthernHandlers.isGolfAwaitingPlace).map(event=>georgiaSouthernHandlers.attachGolfPlace(event)));return events.filter(event=>!georgiaSouthernHandlers.isTennisWithoutStory(event)&&!georgiaSouthernHandlers.isGolfWithoutStory?.(event));}}
  ,{school:jamesMadisonSchool,parseSchedule:(...args)=>jamesMadisonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>jamesMadisonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>jamesMadisonHandlers.matchesRecap(...args),crossCountry:{matches:event=>jamesMadisonHandlers.isCrossCountry(event),attach:event=>jamesMadisonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(jamesMadisonHandlers.isFinalWithoutStory(event))await jamesMadisonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>jamesMadisonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>jamesMadisonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(jamesMadisonHandlers.isFinalWithoutStory).map(event=>jamesMadisonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&jamesMadisonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(jamesMadisonHandlers.isGolfAwaitingPlace).map(event=>jamesMadisonHandlers.attachGolfPlace(event)));return events.filter(event=>!jamesMadisonHandlers.isTennisWithoutStory(event)&&!jamesMadisonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:louisianaSchool,parseSchedule:(...args)=>louisianaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>louisianaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>louisianaHandlers.matchesRecap(...args),crossCountry:{matches:event=>louisianaHandlers.isCrossCountry(event),attach:event=>louisianaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(louisianaHandlers.isFinalWithoutStory(event))await louisianaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>louisianaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>louisianaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(louisianaHandlers.isFinalWithoutStory).map(event=>louisianaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&louisianaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(louisianaHandlers.isGolfAwaitingPlace).map(event=>louisianaHandlers.attachGolfPlace(event)));return events.filter(event=>!louisianaHandlers.isTennisWithoutStory(event)&&!louisianaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:louisianaTechSchool,parseSchedule:(...args)=>louisianaTechHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>louisianaTechHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>louisianaTechHandlers.matchesRecap(...args),crossCountry:{matches:event=>louisianaTechHandlers.isCrossCountry(event),attach:event=>louisianaTechHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(louisianaTechHandlers.isFinalWithoutStory(event))await louisianaTechHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>louisianaTechHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>louisianaTechHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(louisianaTechHandlers.isFinalWithoutStory).map(event=>louisianaTechHandlers.attachArchiveStory(event)));if(sport==='Golf'&&louisianaTechHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(louisianaTechHandlers.isGolfAwaitingPlace).map(event=>louisianaTechHandlers.attachGolfPlace(event)));return events.filter(event=>!louisianaTechHandlers.isTennisWithoutStory(event)&&!louisianaTechHandlers.isGolfWithoutStory?.(event));}}
  ,{school:marshallSchool,parseSchedule:(...args)=>marshallHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>marshallHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>marshallHandlers.matchesRecap(...args),crossCountry:{matches:event=>marshallHandlers.isCrossCountry(event),attach:event=>marshallHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(marshallHandlers.isFinalWithoutStory(event))await marshallHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>marshallHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>marshallHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(marshallHandlers.isFinalWithoutStory).map(event=>marshallHandlers.attachArchiveStory(event)));if(sport==='Golf'&&marshallHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(marshallHandlers.isGolfAwaitingPlace).map(event=>marshallHandlers.attachGolfPlace(event)));return events.filter(event=>!marshallHandlers.isTennisWithoutStory(event)&&!marshallHandlers.isGolfWithoutStory?.(event));}}
  ,{school:oldDominionSchool,parseSchedule:(...args)=>oldDominionHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>oldDominionHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>oldDominionHandlers.matchesRecap(...args),crossCountry:{matches:event=>oldDominionHandlers.isCrossCountry(event),attach:event=>oldDominionHandlers.attachMeetResults(event)}}
  ,{school:southAlabamaSchool,parseSchedule:(...args)=>southAlabamaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southAlabamaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southAlabamaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southAlabamaHandlers.isCrossCountry(event),attach:event=>southAlabamaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southAlabamaHandlers.isFinalWithoutStory(event))await southAlabamaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southAlabamaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southAlabamaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southAlabamaHandlers.isFinalWithoutStory).map(event=>southAlabamaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southAlabamaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southAlabamaHandlers.isGolfAwaitingPlace).map(event=>southAlabamaHandlers.attachGolfPlace(event)));return events.filter(event=>!southAlabamaHandlers.isTennisWithoutStory(event)&&!southAlabamaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southernMissSchool,parseSchedule:(...args)=>southernMissHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southernMissHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southernMissHandlers.matchesRecap(...args),crossCountry:{matches:event=>southernMissHandlers.isCrossCountry(event),attach:event=>southernMissHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southernMissHandlers.isFinalWithoutStory(event))await southernMissHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southernMissHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southernMissHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southernMissHandlers.isFinalWithoutStory).map(event=>southernMissHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southernMissHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southernMissHandlers.isGolfAwaitingPlace).map(event=>southernMissHandlers.attachGolfPlace(event)));return events.filter(event=>!southernMissHandlers.isTennisWithoutStory(event)&&!southernMissHandlers.isGolfWithoutStory?.(event));}}
  ,{school:troySchool,parseSchedule:(...args)=>troyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>troyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>troyHandlers.matchesRecap(...args),crossCountry:{matches:event=>troyHandlers.isCrossCountry(event),attach:event=>troyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(troyHandlers.isFinalWithoutStory(event))await troyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>troyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>troyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(troyHandlers.isFinalWithoutStory).map(event=>troyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&troyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(troyHandlers.isGolfAwaitingPlace).map(event=>troyHandlers.attachGolfPlace(event)));return events.filter(event=>!troyHandlers.isTennisWithoutStory(event)&&!troyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ulmSchool,parseSchedule:(...args)=>ulmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ulmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ulmHandlers.matchesRecap(...args),crossCountry:{matches:event=>ulmHandlers.isCrossCountry(event),attach:event=>ulmHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ulmHandlers.isFinalWithoutStory(event))await ulmHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ulmHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ulmHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ulmHandlers.isFinalWithoutStory).map(event=>ulmHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ulmHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ulmHandlers.isGolfAwaitingPlace).map(event=>ulmHandlers.attachGolfPlace(event)));return events.filter(event=>!ulmHandlers.isTennisWithoutStory(event)&&!ulmHandlers.isGolfWithoutStory?.(event));}}
  ,{school:airForceSchool,parseSchedule:(...args)=>airForceHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>airForceHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>airForceHandlers.matchesRecap(...args),crossCountry:{matches:event=>airForceHandlers.isCrossCountry(event),attach:event=>airForceHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(airForceHandlers.isFinalWithoutStory(event))await airForceHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>airForceHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>airForceHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(airForceHandlers.isFinalWithoutStory).map(event=>airForceHandlers.attachArchiveStory(event)));if(sport==='Golf'&&airForceHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(airForceHandlers.isGolfAwaitingPlace).map(event=>airForceHandlers.attachGolfPlace(event)));return events.filter(event=>!airForceHandlers.isTennisWithoutStory(event)&&!airForceHandlers.isGolfWithoutStory?.(event));}}
  ,{school:grandCanyonSchool,parseSchedule:(...args)=>grandCanyonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>grandCanyonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>grandCanyonHandlers.matchesRecap(...args),crossCountry:{matches:event=>grandCanyonHandlers.isCrossCountry(event),attach:event=>grandCanyonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(grandCanyonHandlers.isFinalWithoutStory(event))await grandCanyonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>grandCanyonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>grandCanyonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(grandCanyonHandlers.isFinalWithoutStory).map(event=>grandCanyonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&grandCanyonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(grandCanyonHandlers.isGolfAwaitingPlace).map(event=>grandCanyonHandlers.attachGolfPlace(event)));return events.filter(event=>!grandCanyonHandlers.isTennisWithoutStory(event)&&!grandCanyonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:newMexicoSchool,parseSchedule:(...args)=>newMexicoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>newMexicoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>newMexicoHandlers.matchesRecap(...args),crossCountry:{matches:event=>newMexicoHandlers.isCrossCountry(event),attach:event=>newMexicoHandlers.attachMeetResults(event)}}
  ,{school:sanJoseStateSchool,parseSchedule:(...args)=>sanJoseStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sanJoseStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sanJoseStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>sanJoseStateHandlers.isCrossCountry(event),attach:event=>sanJoseStateHandlers.attachMeetResults(event)}}
  ,{school:ucDavisSchool,parseSchedule:(...args)=>ucDavisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucDavisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucDavisHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucDavisHandlers.isCrossCountry(event),attach:event=>ucDavisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ucDavisHandlers.isFinalWithoutStory(event))await ucDavisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ucDavisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ucDavisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ucDavisHandlers.isFinalWithoutStory).map(event=>ucDavisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ucDavisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ucDavisHandlers.isGolfAwaitingPlace).map(event=>ucDavisHandlers.attachGolfPlace(event)));return events.filter(event=>!ucDavisHandlers.isTennisWithoutStory(event)&&!ucDavisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:unlvSchool,parseSchedule:(...args)=>unlvHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>unlvHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>unlvHandlers.matchesRecap(...args),crossCountry:{matches:event=>unlvHandlers.isCrossCountry(event),attach:event=>unlvHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(unlvHandlers.isFinalWithoutStory(event))await unlvHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>unlvHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>unlvHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(unlvHandlers.isFinalWithoutStory).map(event=>unlvHandlers.attachArchiveStory(event)));if(sport==='Golf'&&unlvHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(unlvHandlers.isGolfAwaitingPlace).map(event=>unlvHandlers.attachGolfPlace(event)));return events.filter(event=>!unlvHandlers.isTennisWithoutStory(event)&&!unlvHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utepSchool,parseSchedule:(...args)=>utepHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utepHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utepHandlers.matchesRecap(...args),crossCountry:{matches:event=>utepHandlers.isCrossCountry(event),attach:event=>utepHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utepHandlers.isFinalWithoutStory(event))await utepHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utepHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utepHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utepHandlers.isFinalWithoutStory).map(event=>utepHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utepHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utepHandlers.isGolfAwaitingPlace).map(event=>utepHandlers.attachGolfPlace(event)));return events.filter(event=>!utepHandlers.isTennisWithoutStory(event)&&!utepHandlers.isGolfWithoutStory?.(event));}}
  ,{school:akronSchool,parseSchedule:(...args)=>akronHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>akronHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>akronHandlers.matchesRecap(...args),crossCountry:{matches:event=>akronHandlers.isCrossCountry(event),attach:event=>akronHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(akronHandlers.isFinalWithoutStory(event))await akronHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>akronHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>akronHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(akronHandlers.isFinalWithoutStory).map(event=>akronHandlers.attachArchiveStory(event)));if(sport==='Golf'&&akronHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(akronHandlers.isGolfAwaitingPlace).map(event=>akronHandlers.attachGolfPlace(event)));return events.filter(event=>!akronHandlers.isTennisWithoutStory(event)&&!akronHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ballStateSchool,parseSchedule:(...args)=>ballStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ballStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ballStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>ballStateHandlers.isCrossCountry(event),attach:event=>ballStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ballStateHandlers.isFinalWithoutStory(event))await ballStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ballStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ballStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ballStateHandlers.isFinalWithoutStory).map(event=>ballStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ballStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ballStateHandlers.isGolfAwaitingPlace).map(event=>ballStateHandlers.attachGolfPlace(event)));return events.filter(event=>!ballStateHandlers.isTennisWithoutStory(event)&&!ballStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bowlingGreenSchool,parseSchedule:(...args)=>bowlingGreenHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bowlingGreenHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bowlingGreenHandlers.matchesRecap(...args),crossCountry:{matches:event=>bowlingGreenHandlers.isCrossCountry(event),attach:event=>bowlingGreenHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bowlingGreenHandlers.isFinalWithoutStory(event))await bowlingGreenHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bowlingGreenHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bowlingGreenHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bowlingGreenHandlers.isFinalWithoutStory).map(event=>bowlingGreenHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bowlingGreenHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bowlingGreenHandlers.isGolfAwaitingPlace).map(event=>bowlingGreenHandlers.attachGolfPlace(event)));return events.filter(event=>!bowlingGreenHandlers.isTennisWithoutStory(event)&&!bowlingGreenHandlers.isGolfWithoutStory?.(event));}}
  ,{school:buffaloSchool,parseSchedule:(...args)=>buffaloHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>buffaloHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>buffaloHandlers.matchesRecap(...args),crossCountry:{matches:event=>buffaloHandlers.isCrossCountry(event),attach:event=>buffaloHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(buffaloHandlers.isFinalWithoutStory(event))await buffaloHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>buffaloHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>buffaloHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(buffaloHandlers.isFinalWithoutStory).map(event=>buffaloHandlers.attachArchiveStory(event)));if(sport==='Golf'&&buffaloHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(buffaloHandlers.isGolfAwaitingPlace).map(event=>buffaloHandlers.attachGolfPlace(event)));return events.filter(event=>!buffaloHandlers.isTennisWithoutStory(event)&&!buffaloHandlers.isGolfWithoutStory?.(event));}}
  ,{school:centralMichiganSchool,parseSchedule:(...args)=>centralMichiganHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>centralMichiganHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>centralMichiganHandlers.matchesRecap(...args),crossCountry:{matches:event=>centralMichiganHandlers.isCrossCountry(event),attach:event=>centralMichiganHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(centralMichiganHandlers.isFinalWithoutStory(event))await centralMichiganHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>centralMichiganHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>centralMichiganHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(centralMichiganHandlers.isFinalWithoutStory).map(event=>centralMichiganHandlers.attachArchiveStory(event)));if(sport==='Golf'&&centralMichiganHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(centralMichiganHandlers.isGolfAwaitingPlace).map(event=>centralMichiganHandlers.attachGolfPlace(event)));return events.filter(event=>!centralMichiganHandlers.isTennisWithoutStory(event)&&!centralMichiganHandlers.isGolfWithoutStory?.(event));}}
  ,{school:easternMichiganSchool,parseSchedule:(...args)=>easternMichiganHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>easternMichiganHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>easternMichiganHandlers.matchesRecap(...args),crossCountry:{matches:event=>easternMichiganHandlers.isCrossCountry(event),attach:event=>easternMichiganHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(easternMichiganHandlers.isFinalWithoutStory(event))await easternMichiganHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>easternMichiganHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>easternMichiganHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(easternMichiganHandlers.isFinalWithoutStory).map(event=>easternMichiganHandlers.attachArchiveStory(event)));if(sport==='Golf'&&easternMichiganHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(easternMichiganHandlers.isGolfAwaitingPlace).map(event=>easternMichiganHandlers.attachGolfPlace(event)));return events.filter(event=>!easternMichiganHandlers.isTennisWithoutStory(event)&&!easternMichiganHandlers.isGolfWithoutStory?.(event));}}
  ,{school:kentStateSchool,parseSchedule:(...args)=>kentStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>kentStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>kentStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>kentStateHandlers.isCrossCountry(event),attach:event=>kentStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(kentStateHandlers.isFinalWithoutStory(event))await kentStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>kentStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>kentStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(kentStateHandlers.isFinalWithoutStory).map(event=>kentStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&kentStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(kentStateHandlers.isGolfAwaitingPlace).map(event=>kentStateHandlers.attachGolfPlace(event)));return events.filter(event=>!kentStateHandlers.isTennisWithoutStory(event)&&!kentStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:miamiOhSchool,parseSchedule:(...args)=>miamiOhHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>miamiOhHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>miamiOhHandlers.matchesRecap(...args),crossCountry:{matches:event=>miamiOhHandlers.isCrossCountry(event),attach:event=>miamiOhHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(miamiOhHandlers.isFinalWithoutStory(event))await miamiOhHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>miamiOhHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>miamiOhHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(miamiOhHandlers.isFinalWithoutStory).map(event=>miamiOhHandlers.attachArchiveStory(event)));if(sport==='Golf'&&miamiOhHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(miamiOhHandlers.isGolfAwaitingPlace).map(event=>miamiOhHandlers.attachGolfPlace(event)));return events.filter(event=>!miamiOhHandlers.isTennisWithoutStory(event)&&!miamiOhHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ohioSchool,parseSchedule:(...args)=>ohioHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ohioHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ohioHandlers.matchesRecap(...args),crossCountry:{matches:event=>ohioHandlers.isCrossCountry(event),attach:event=>ohioHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ohioHandlers.isFinalWithoutStory(event))await ohioHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ohioHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ohioHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ohioHandlers.isFinalWithoutStory).map(event=>ohioHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ohioHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ohioHandlers.isGolfAwaitingPlace).map(event=>ohioHandlers.attachGolfPlace(event)));return events.filter(event=>!ohioHandlers.isTennisWithoutStory(event)&&!ohioHandlers.isGolfWithoutStory?.(event));}}
  ,{school:toledoSchool,parseSchedule:(...args)=>toledoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>toledoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>toledoHandlers.matchesRecap(...args),crossCountry:{matches:event=>toledoHandlers.isCrossCountry(event),attach:event=>toledoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(toledoHandlers.isFinalWithoutStory(event))await toledoHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>toledoHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>toledoHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(toledoHandlers.isFinalWithoutStory).map(event=>toledoHandlers.attachArchiveStory(event)));if(sport==='Golf'&&toledoHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(toledoHandlers.isGolfAwaitingPlace).map(event=>toledoHandlers.attachGolfPlace(event)));return events.filter(event=>!toledoHandlers.isTennisWithoutStory(event)&&!toledoHandlers.isGolfWithoutStory?.(event));}}
  ,{school:umassSchool,parseSchedule:(...args)=>umassHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>umassHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>umassHandlers.matchesRecap(...args),crossCountry:{matches:event=>umassHandlers.isCrossCountry(event),attach:event=>umassHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(umassHandlers.isFinalWithoutStory(event))await umassHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>umassHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>umassHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(umassHandlers.isFinalWithoutStory).map(event=>umassHandlers.attachArchiveStory(event)));if(sport==='Golf'&&umassHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(umassHandlers.isGolfAwaitingPlace).map(event=>umassHandlers.attachGolfPlace(event)));return events.filter(event=>!umassHandlers.isTennisWithoutStory(event)&&!umassHandlers.isGolfWithoutStory?.(event));}}
  ,{school:calBaptistSchool,parseSchedule:(...args)=>calBaptistHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>calBaptistHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>calBaptistHandlers.matchesRecap(...args),crossCountry:{matches:event=>calBaptistHandlers.isCrossCountry(event),attach:event=>calBaptistHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(calBaptistHandlers.isFinalWithoutStory(event))await calBaptistHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>calBaptistHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>calBaptistHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(calBaptistHandlers.isFinalWithoutStory).map(event=>calBaptistHandlers.attachArchiveStory(event)));if(sport==='Golf'&&calBaptistHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(calBaptistHandlers.isGolfAwaitingPlace).map(event=>calBaptistHandlers.attachGolfPlace(event)));return events.filter(event=>!calBaptistHandlers.isTennisWithoutStory(event)&&!calBaptistHandlers.isGolfWithoutStory?.(event));}}
  ,{school:calPolySchool,parseSchedule:(...args)=>calPolyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>calPolyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>calPolyHandlers.matchesRecap(...args),crossCountry:{matches:event=>calPolyHandlers.isCrossCountry(event),attach:event=>calPolyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(calPolyHandlers.isFinalWithoutStory(event))await calPolyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>calPolyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>calPolyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(calPolyHandlers.isFinalWithoutStory).map(event=>calPolyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&calPolyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(calPolyHandlers.isGolfAwaitingPlace).map(event=>calPolyHandlers.attachGolfPlace(event)));return events.filter(event=>!calPolyHandlers.isTennisWithoutStory(event)&&!calPolyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:calStateFullertonSchool,parseSchedule:(...args)=>calStateFullertonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>calStateFullertonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>calStateFullertonHandlers.matchesRecap(...args),crossCountry:{matches:event=>calStateFullertonHandlers.isCrossCountry(event),attach:event=>calStateFullertonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(calStateFullertonHandlers.isFinalWithoutStory(event))await calStateFullertonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>calStateFullertonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>calStateFullertonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(calStateFullertonHandlers.isFinalWithoutStory).map(event=>calStateFullertonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&calStateFullertonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(calStateFullertonHandlers.isGolfAwaitingPlace).map(event=>calStateFullertonHandlers.attachGolfPlace(event)));return events.filter(event=>!calStateFullertonHandlers.isTennisWithoutStory(event)&&!calStateFullertonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:csunSchool,parseSchedule:(...args)=>csunHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>csunHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>csunHandlers.matchesRecap(...args),crossCountry:{matches:event=>csunHandlers.isCrossCountry(event),attach:event=>csunHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(csunHandlers.isFinalWithoutStory(event))await csunHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>csunHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>csunHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(csunHandlers.isFinalWithoutStory).map(event=>csunHandlers.attachArchiveStory(event)));if(sport==='Golf'&&csunHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(csunHandlers.isGolfAwaitingPlace).map(event=>csunHandlers.attachGolfPlace(event)));return events.filter(event=>!csunHandlers.isTennisWithoutStory(event)&&!csunHandlers.isGolfWithoutStory?.(event));}}
  ,{school:longBeachStateSchool,parseSchedule:(...args)=>longBeachStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>longBeachStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>longBeachStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>longBeachStateHandlers.isCrossCountry(event),attach:event=>longBeachStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(longBeachStateHandlers.isFinalWithoutStory(event))await longBeachStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>longBeachStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>longBeachStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(longBeachStateHandlers.isFinalWithoutStory).map(event=>longBeachStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&longBeachStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(longBeachStateHandlers.isGolfAwaitingPlace).map(event=>longBeachStateHandlers.attachGolfPlace(event)));return events.filter(event=>!longBeachStateHandlers.isTennisWithoutStory(event)&&!longBeachStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ucIrvineSchool,parseSchedule:(...args)=>ucIrvineHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucIrvineHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucIrvineHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucIrvineHandlers.isCrossCountry(event),attach:event=>ucIrvineHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ucIrvineHandlers.isFinalWithoutStory(event))await ucIrvineHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ucIrvineHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ucIrvineHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ucIrvineHandlers.isFinalWithoutStory).map(event=>ucIrvineHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ucIrvineHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ucIrvineHandlers.isGolfAwaitingPlace).map(event=>ucIrvineHandlers.attachGolfPlace(event)));return events.filter(event=>!ucIrvineHandlers.isTennisWithoutStory(event)&&!ucIrvineHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ucRiversideSchool,parseSchedule:(...args)=>ucRiversideHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucRiversideHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucRiversideHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucRiversideHandlers.isCrossCountry(event),attach:event=>ucRiversideHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ucRiversideHandlers.isFinalWithoutStory(event))await ucRiversideHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ucRiversideHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ucRiversideHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ucRiversideHandlers.isFinalWithoutStory).map(event=>ucRiversideHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ucRiversideHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ucRiversideHandlers.isGolfAwaitingPlace).map(event=>ucRiversideHandlers.attachGolfPlace(event)));return events.filter(event=>!ucRiversideHandlers.isTennisWithoutStory(event)&&!ucRiversideHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ucSanDiegoSchool,parseSchedule:(...args)=>ucSanDiegoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucSanDiegoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucSanDiegoHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucSanDiegoHandlers.isCrossCountry(event),attach:event=>ucSanDiegoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ucSanDiegoHandlers.isFinalWithoutStory(event))await ucSanDiegoHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ucSanDiegoHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ucSanDiegoHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ucSanDiegoHandlers.isFinalWithoutStory).map(event=>ucSanDiegoHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ucSanDiegoHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ucSanDiegoHandlers.isGolfAwaitingPlace).map(event=>ucSanDiegoHandlers.attachGolfPlace(event)));return events.filter(event=>!ucSanDiegoHandlers.isTennisWithoutStory(event)&&!ucSanDiegoHandlers.isGolfWithoutStory?.(event));}}
  ,{school:sacramentoStateSchool,parseSchedule:(...args)=>sacramentoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sacramentoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sacramentoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>sacramentoStateHandlers.isCrossCountry(event),attach:event=>sacramentoStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(sacramentoStateHandlers.isFinalWithoutStory(event))await sacramentoStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>sacramentoStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>sacramentoStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(sacramentoStateHandlers.isFinalWithoutStory).map(event=>sacramentoStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&sacramentoStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(sacramentoStateHandlers.isGolfAwaitingPlace).map(event=>sacramentoStateHandlers.attachGolfPlace(event)));return events.filter(event=>!sacramentoStateHandlers.isTennisWithoutStory(event)&&!sacramentoStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utahValleySchool,parseSchedule:(...args)=>utahValleyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utahValleyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utahValleyHandlers.matchesRecap(...args),crossCountry:{matches:event=>utahValleyHandlers.isCrossCountry(event),attach:event=>utahValleyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utahValleyHandlers.isFinalWithoutStory(event))await utahValleyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utahValleyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utahValleyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utahValleyHandlers.isFinalWithoutStory).map(event=>utahValleyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utahValleyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utahValleyHandlers.isGolfAwaitingPlace).map(event=>utahValleyHandlers.attachGolfPlace(event)));return events.filter(event=>!utahValleyHandlers.isTennisWithoutStory(event)&&!utahValleyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:csuBakersfieldSchool,parseSchedule:(...args)=>csuBakersfieldHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>csuBakersfieldHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>csuBakersfieldHandlers.matchesRecap(...args),crossCountry:{matches:event=>csuBakersfieldHandlers.isCrossCountry(event),attach:event=>csuBakersfieldHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(csuBakersfieldHandlers.isFinalWithoutStory(event))await csuBakersfieldHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>csuBakersfieldHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>csuBakersfieldHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(csuBakersfieldHandlers.isFinalWithoutStory).map(event=>csuBakersfieldHandlers.attachArchiveStory(event)));if(sport==='Golf'&&csuBakersfieldHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(csuBakersfieldHandlers.isGolfAwaitingPlace).map(event=>csuBakersfieldHandlers.attachGolfPlace(event)));return events.filter(event=>!csuBakersfieldHandlers.isTennisWithoutStory(event)&&!csuBakersfieldHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ucSantaBarbaraSchool,parseSchedule:(...args)=>ucSantaBarbaraHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ucSantaBarbaraHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ucSantaBarbaraHandlers.matchesRecap(...args),crossCountry:{matches:event=>ucSantaBarbaraHandlers.isCrossCountry(event),attach:event=>ucSantaBarbaraHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ucSantaBarbaraHandlers.isFinalWithoutStory(event))await ucSantaBarbaraHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ucSantaBarbaraHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ucSantaBarbaraHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ucSantaBarbaraHandlers.isFinalWithoutStory).map(event=>ucSantaBarbaraHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ucSantaBarbaraHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ucSantaBarbaraHandlers.isGolfAwaitingPlace).map(event=>ucSantaBarbaraHandlers.attachGolfPlace(event)));return events.filter(event=>!ucSantaBarbaraHandlers.isTennisWithoutStory(event)&&!ucSantaBarbaraHandlers.isGolfWithoutStory?.(event));}}
  ,{school:charlotteSchool,parseSchedule:(...args)=>charlotteHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>charlotteHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>charlotteHandlers.matchesRecap(...args),crossCountry:{matches:event=>charlotteHandlers.isCrossCountry(event),attach:event=>charlotteHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(charlotteHandlers.isFinalWithoutStory(event))await charlotteHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>charlotteHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>charlotteHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(charlotteHandlers.isFinalWithoutStory).map(event=>charlotteHandlers.attachArchiveStory(event)));if(sport==='Golf'&&charlotteHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(charlotteHandlers.isGolfAwaitingPlace).map(event=>charlotteHandlers.attachGolfPlace(event)));return events.filter(event=>!charlotteHandlers.isTennisWithoutStory(event)&&!charlotteHandlers.isGolfWithoutStory?.(event));}}
  ,{school:eastCarolinaSchool,parseSchedule:(...args)=>eastCarolinaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>eastCarolinaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>eastCarolinaHandlers.matchesRecap(...args),crossCountry:{matches:event=>eastCarolinaHandlers.isCrossCountry(event),attach:event=>eastCarolinaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(eastCarolinaHandlers.isFinalWithoutStory(event))await eastCarolinaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>eastCarolinaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>eastCarolinaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(eastCarolinaHandlers.isFinalWithoutStory).map(event=>eastCarolinaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&eastCarolinaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(eastCarolinaHandlers.isGolfAwaitingPlace).map(event=>eastCarolinaHandlers.attachGolfPlace(event)));return events.filter(event=>!eastCarolinaHandlers.isTennisWithoutStory(event)&&!eastCarolinaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:fauSchool,parseSchedule:(...args)=>fauHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>fauHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>fauHandlers.matchesRecap(...args),crossCountry:{matches:event=>fauHandlers.isCrossCountry(event),attach:event=>fauHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(fauHandlers.isFinalWithoutStory(event))await fauHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>fauHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>fauHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(fauHandlers.isFinalWithoutStory).map(event=>fauHandlers.attachArchiveStory(event)));if(sport==='Golf'&&fauHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(fauHandlers.isGolfAwaitingPlace).map(event=>fauHandlers.attachGolfPlace(event)));return events.filter(event=>!fauHandlers.isTennisWithoutStory(event)&&!fauHandlers.isGolfWithoutStory?.(event));}}
  ,{school:memphisSchool,parseSchedule:(...args)=>memphisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>memphisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>memphisHandlers.matchesRecap(...args),crossCountry:{matches:event=>memphisHandlers.isCrossCountry(event),attach:event=>memphisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(memphisHandlers.isFinalWithoutStory(event))await memphisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>memphisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>memphisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(memphisHandlers.isFinalWithoutStory).map(event=>memphisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&memphisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(memphisHandlers.isGolfAwaitingPlace).map(event=>memphisHandlers.attachGolfPlace(event)));return events.filter(event=>!memphisHandlers.isTennisWithoutStory(event)&&!memphisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northTexasSchool,parseSchedule:(...args)=>northTexasHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northTexasHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northTexasHandlers.matchesRecap(...args),crossCountry:{matches:event=>northTexasHandlers.isCrossCountry(event),attach:event=>northTexasHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northTexasHandlers.isFinalWithoutStory(event))await northTexasHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northTexasHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northTexasHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northTexasHandlers.isFinalWithoutStory).map(event=>northTexasHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northTexasHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northTexasHandlers.isGolfAwaitingPlace).map(event=>northTexasHandlers.attachGolfPlace(event)));return events.filter(event=>!northTexasHandlers.isTennisWithoutStory(event)&&!northTexasHandlers.isGolfWithoutStory?.(event));}}
  ,{school:riceSchool,parseSchedule:(...args)=>riceHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>riceHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>riceHandlers.matchesRecap(...args),crossCountry:{matches:event=>riceHandlers.isCrossCountry(event),attach:event=>riceHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(riceHandlers.isFinalWithoutStory(event))await riceHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>riceHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>riceHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(riceHandlers.isFinalWithoutStory).map(event=>riceHandlers.attachArchiveStory(event)));if(sport==='Golf'&&riceHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(riceHandlers.isGolfAwaitingPlace).map(event=>riceHandlers.attachGolfPlace(event)));return events.filter(event=>!riceHandlers.isTennisWithoutStory(event)&&!riceHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southFloridaSchool,parseSchedule:(...args)=>southFloridaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southFloridaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southFloridaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southFloridaHandlers.isCrossCountry(event),attach:event=>southFloridaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southFloridaHandlers.isFinalWithoutStory(event))await southFloridaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southFloridaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southFloridaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southFloridaHandlers.isFinalWithoutStory).map(event=>southFloridaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southFloridaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southFloridaHandlers.isGolfAwaitingPlace).map(event=>southFloridaHandlers.attachGolfPlace(event)));return events.filter(event=>!southFloridaHandlers.isTennisWithoutStory(event)&&!southFloridaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:templeSchool,parseSchedule:(...args)=>templeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>templeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>templeHandlers.matchesRecap(...args),crossCountry:{matches:event=>templeHandlers.isCrossCountry(event),attach:event=>templeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(templeHandlers.isFinalWithoutStory(event))await templeHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>templeHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>templeHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(templeHandlers.isFinalWithoutStory).map(event=>templeHandlers.attachArchiveStory(event)));if(sport==='Golf'&&templeHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(templeHandlers.isGolfAwaitingPlace).map(event=>templeHandlers.attachGolfPlace(event)));return events.filter(event=>!templeHandlers.isTennisWithoutStory(event)&&!templeHandlers.isGolfWithoutStory?.(event));}}
  ,{school:tulaneSchool,parseSchedule:(...args)=>tulaneHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tulaneHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tulaneHandlers.matchesRecap(...args),crossCountry:{matches:event=>tulaneHandlers.isCrossCountry(event),attach:event=>tulaneHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tulaneHandlers.isFinalWithoutStory(event))await tulaneHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>tulaneHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>tulaneHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(tulaneHandlers.isFinalWithoutStory).map(event=>tulaneHandlers.attachArchiveStory(event)));if(sport==='Golf'&&tulaneHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(tulaneHandlers.isGolfAwaitingPlace).map(event=>tulaneHandlers.attachGolfPlace(event)));return events.filter(event=>!tulaneHandlers.isTennisWithoutStory(event)&&!tulaneHandlers.isGolfWithoutStory?.(event));}}
  ,{school:tulsaSchool,parseSchedule:(...args)=>tulsaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tulsaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tulsaHandlers.matchesRecap(...args),crossCountry:{matches:event=>tulsaHandlers.isCrossCountry(event),attach:event=>tulsaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tulsaHandlers.isFinalWithoutStory(event))await tulsaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>tulsaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>tulsaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(tulsaHandlers.isFinalWithoutStory).map(event=>tulsaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&tulsaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(tulsaHandlers.isGolfAwaitingPlace).map(event=>tulsaHandlers.attachGolfPlace(event)));return events.filter(event=>!tulsaHandlers.isTennisWithoutStory(event)&&!tulsaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uabSchool,parseSchedule:(...args)=>uabHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uabHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uabHandlers.matchesRecap(...args),crossCountry:{matches:event=>uabHandlers.isCrossCountry(event),attach:event=>uabHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(uabHandlers.isFinalWithoutStory(event))await uabHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>uabHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>uabHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(uabHandlers.isFinalWithoutStory).map(event=>uabHandlers.attachArchiveStory(event)));if(sport==='Golf'&&uabHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(uabHandlers.isGolfAwaitingPlace).map(event=>uabHandlers.attachGolfPlace(event)));return events.filter(event=>!uabHandlers.isTennisWithoutStory(event)&&!uabHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utsaSchool,parseSchedule:(...args)=>utsaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utsaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utsaHandlers.matchesRecap(...args),crossCountry:{matches:event=>utsaHandlers.isCrossCountry(event),attach:event=>utsaHandlers.attachMeetResults(event)}}
  ,{school:delawareSchool,parseSchedule:(...args)=>delawareHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>delawareHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>delawareHandlers.matchesRecap(...args),crossCountry:{matches:event=>delawareHandlers.isCrossCountry(event),attach:event=>delawareHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(delawareHandlers.isFinalWithoutStory(event))await delawareHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>delawareHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>delawareHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(delawareHandlers.isFinalWithoutStory).map(event=>delawareHandlers.attachArchiveStory(event)));if(sport==='Golf'&&delawareHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(delawareHandlers.isGolfAwaitingPlace).map(event=>delawareHandlers.attachGolfPlace(event)));return events.filter(event=>!delawareHandlers.isTennisWithoutStory(event)&&!delawareHandlers.isGolfWithoutStory?.(event));}}
  ,{school:fiuSchool,parseSchedule:(...args)=>fiuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>fiuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>fiuHandlers.matchesRecap(...args),crossCountry:{matches:event=>fiuHandlers.isCrossCountry(event),attach:event=>fiuHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(fiuHandlers.isFinalWithoutStory(event))await fiuHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>fiuHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>fiuHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(fiuHandlers.isFinalWithoutStory).map(event=>fiuHandlers.attachArchiveStory(event)));if(sport==='Golf'&&fiuHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(fiuHandlers.isGolfAwaitingPlace).map(event=>fiuHandlers.attachGolfPlace(event)));return events.filter(event=>!fiuHandlers.isTennisWithoutStory(event)&&!fiuHandlers.isGolfWithoutStory?.(event));}}
  ,{school:jacksonvilleStateSchool,parseSchedule:(...args)=>jacksonvilleStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>jacksonvilleStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>jacksonvilleStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>jacksonvilleStateHandlers.isCrossCountry(event),attach:event=>jacksonvilleStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(jacksonvilleStateHandlers.isFinalWithoutStory(event))await jacksonvilleStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>jacksonvilleStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>jacksonvilleStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(jacksonvilleStateHandlers.isFinalWithoutStory).map(event=>jacksonvilleStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&jacksonvilleStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(jacksonvilleStateHandlers.isGolfAwaitingPlace).map(event=>jacksonvilleStateHandlers.attachGolfPlace(event)));return events.filter(event=>!jacksonvilleStateHandlers.isTennisWithoutStory(event)&&!jacksonvilleStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:libertySchool,parseSchedule:(...args)=>libertyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>libertyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>libertyHandlers.matchesRecap(...args),crossCountry:{matches:event=>libertyHandlers.isCrossCountry(event),attach:event=>libertyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(libertyHandlers.isFinalWithoutStory(event))await libertyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>libertyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>libertyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(libertyHandlers.isFinalWithoutStory).map(event=>libertyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&libertyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(libertyHandlers.isGolfAwaitingPlace).map(event=>libertyHandlers.attachGolfPlace(event)));return events.filter(event=>!libertyHandlers.isTennisWithoutStory(event)&&!libertyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:middleTennesseeSchool,parseSchedule:(...args)=>middleTennesseeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>middleTennesseeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>middleTennesseeHandlers.matchesRecap(...args),crossCountry:{matches:event=>middleTennesseeHandlers.isCrossCountry(event),attach:event=>middleTennesseeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(middleTennesseeHandlers.isFinalWithoutStory(event))await middleTennesseeHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>middleTennesseeHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>middleTennesseeHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(middleTennesseeHandlers.isFinalWithoutStory).map(event=>middleTennesseeHandlers.attachArchiveStory(event)));if(sport==='Golf'&&middleTennesseeHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(middleTennesseeHandlers.isGolfAwaitingPlace).map(event=>middleTennesseeHandlers.attachGolfPlace(event)));return events.filter(event=>!middleTennesseeHandlers.isTennisWithoutStory(event)&&!middleTennesseeHandlers.isGolfWithoutStory?.(event));}}
  ,{school:missouriStateSchool,parseSchedule:(...args)=>missouriStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>missouriStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>missouriStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>missouriStateHandlers.isCrossCountry(event),attach:event=>missouriStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(missouriStateHandlers.isFinalWithoutStory(event))await missouriStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>missouriStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>missouriStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(missouriStateHandlers.isFinalWithoutStory).map(event=>missouriStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&missouriStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(missouriStateHandlers.isGolfAwaitingPlace).map(event=>missouriStateHandlers.attachGolfPlace(event)));return events.filter(event=>!missouriStateHandlers.isTennisWithoutStory(event)&&!missouriStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:samHoustonSchool,parseSchedule:(...args)=>samHoustonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>samHoustonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>samHoustonHandlers.matchesRecap(...args),crossCountry:{matches:event=>samHoustonHandlers.isCrossCountry(event),attach:event=>samHoustonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(samHoustonHandlers.isFinalWithoutStory(event))await samHoustonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>samHoustonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>samHoustonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(samHoustonHandlers.isFinalWithoutStory).map(event=>samHoustonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&samHoustonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(samHoustonHandlers.isGolfAwaitingPlace).map(event=>samHoustonHandlers.attachGolfPlace(event)));return events.filter(event=>!samHoustonHandlers.isTennisWithoutStory(event)&&!samHoustonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:westernKentuckySchool,parseSchedule:(...args)=>westernKentuckyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westernKentuckyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westernKentuckyHandlers.matchesRecap(...args),crossCountry:{matches:event=>westernKentuckyHandlers.isCrossCountry(event),attach:event=>westernKentuckyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westernKentuckyHandlers.isFinalWithoutStory(event))await westernKentuckyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>westernKentuckyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>westernKentuckyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(westernKentuckyHandlers.isFinalWithoutStory).map(event=>westernKentuckyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&westernKentuckyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(westernKentuckyHandlers.isGolfAwaitingPlace).map(event=>westernKentuckyHandlers.attachGolfPlace(event)));return events.filter(event=>!westernKentuckyHandlers.isTennisWithoutStory(event)&&!westernKentuckyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lmuSchool,parseSchedule:(...args)=>lmuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lmuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lmuHandlers.matchesRecap(...args),crossCountry:{matches:event=>lmuHandlers.isCrossCountry(event),attach:event=>lmuHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lmuHandlers.isFinalWithoutStory(event))await lmuHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lmuHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lmuHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lmuHandlers.isFinalWithoutStory).map(event=>lmuHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lmuHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lmuHandlers.isGolfAwaitingPlace).map(event=>lmuHandlers.attachGolfPlace(event)));return events.filter(event=>!lmuHandlers.isTennisWithoutStory(event)&&!lmuHandlers.isGolfWithoutStory?.(event));}}
  ,{school:pacificSchool,parseSchedule:(...args)=>pacificHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>pacificHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>pacificHandlers.matchesRecap(...args),crossCountry:{matches:event=>pacificHandlers.isCrossCountry(event),attach:event=>pacificHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(pacificHandlers.isFinalWithoutStory(event))await pacificHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>pacificHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>pacificHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(pacificHandlers.isFinalWithoutStory).map(event=>pacificHandlers.attachArchiveStory(event)));if(sport==='Golf'&&pacificHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(pacificHandlers.isGolfAwaitingPlace).map(event=>pacificHandlers.attachGolfPlace(event)));return events.filter(event=>!pacificHandlers.isTennisWithoutStory(event)&&!pacificHandlers.isGolfWithoutStory?.(event));}}
  ,{school:pepperdineSchool,parseSchedule:(...args)=>pepperdineHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>pepperdineHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>pepperdineHandlers.matchesRecap(...args),crossCountry:{matches:event=>pepperdineHandlers.isCrossCountry(event),attach:event=>pepperdineHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(pepperdineHandlers.isFinalWithoutStory(event))await pepperdineHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>pepperdineHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>pepperdineHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(pepperdineHandlers.isFinalWithoutStory).map(event=>pepperdineHandlers.attachArchiveStory(event)));if(sport==='Golf'&&pepperdineHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(pepperdineHandlers.isGolfAwaitingPlace).map(event=>pepperdineHandlers.attachGolfPlace(event)));return events.filter(event=>!pepperdineHandlers.isTennisWithoutStory(event)&&!pepperdineHandlers.isGolfWithoutStory?.(event));}}
  ,{school:portlandSchool,parseSchedule:(...args)=>portlandHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>portlandHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>portlandHandlers.matchesRecap(...args),crossCountry:{matches:event=>portlandHandlers.isCrossCountry(event),attach:event=>portlandHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(portlandHandlers.isFinalWithoutStory(event))await portlandHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>portlandHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>portlandHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(portlandHandlers.isFinalWithoutStory).map(event=>portlandHandlers.attachArchiveStory(event)));if(sport==='Golf'&&portlandHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(portlandHandlers.isGolfAwaitingPlace).map(event=>portlandHandlers.attachGolfPlace(event)));return events.filter(event=>!portlandHandlers.isTennisWithoutStory(event)&&!portlandHandlers.isGolfWithoutStory?.(event));}}
  ,{school:saintMarysSchool,parseSchedule:(...args)=>saintMarysHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>saintMarysHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>saintMarysHandlers.matchesRecap(...args),crossCountry:{matches:event=>saintMarysHandlers.isCrossCountry(event),attach:event=>saintMarysHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(saintMarysHandlers.isFinalWithoutStory(event))await saintMarysHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>saintMarysHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>saintMarysHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(saintMarysHandlers.isFinalWithoutStory).map(event=>saintMarysHandlers.attachArchiveStory(event)));if(sport==='Golf'&&saintMarysHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(saintMarysHandlers.isGolfAwaitingPlace).map(event=>saintMarysHandlers.attachGolfPlace(event)));return events.filter(event=>!saintMarysHandlers.isTennisWithoutStory(event)&&!saintMarysHandlers.isGolfWithoutStory?.(event));}}
  ,{school:sanFranciscoSchool,parseSchedule:(...args)=>sanFranciscoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sanFranciscoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sanFranciscoHandlers.matchesRecap(...args),crossCountry:{matches:event=>sanFranciscoHandlers.isCrossCountry(event),attach:event=>sanFranciscoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(sanFranciscoHandlers.isFinalWithoutStory(event))await sanFranciscoHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>sanFranciscoHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>sanFranciscoHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(sanFranciscoHandlers.isFinalWithoutStory).map(event=>sanFranciscoHandlers.attachArchiveStory(event)));if(sport==='Golf'&&sanFranciscoHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(sanFranciscoHandlers.isGolfAwaitingPlace).map(event=>sanFranciscoHandlers.attachGolfPlace(event)));return events.filter(event=>!sanFranciscoHandlers.isTennisWithoutStory(event)&&!sanFranciscoHandlers.isGolfWithoutStory?.(event));}}
  ,{school:santaClaraSchool,parseSchedule:(...args)=>santaClaraHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>santaClaraHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>santaClaraHandlers.matchesRecap(...args),crossCountry:{matches:event=>santaClaraHandlers.isCrossCountry(event),attach:event=>santaClaraHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(santaClaraHandlers.isFinalWithoutStory(event))await santaClaraHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>santaClaraHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>santaClaraHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(santaClaraHandlers.isFinalWithoutStory).map(event=>santaClaraHandlers.attachArchiveStory(event)));if(sport==='Golf'&&santaClaraHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(santaClaraHandlers.isGolfAwaitingPlace).map(event=>santaClaraHandlers.attachGolfPlace(event)));return events.filter(event=>!santaClaraHandlers.isTennisWithoutStory(event)&&!santaClaraHandlers.isGolfWithoutStory?.(event));}}
  ,{school:seattleUSchool,parseSchedule:(...args)=>seattleUHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>seattleUHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>seattleUHandlers.matchesRecap(...args),crossCountry:{matches:event=>seattleUHandlers.isCrossCountry(event),attach:event=>seattleUHandlers.attachMeetResults(event)}}
  ,{school:denverSchool,parseSchedule:(...args)=>denverHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>denverHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>denverHandlers.matchesRecap(...args),crossCountry:{matches:event=>denverHandlers.isCrossCountry(event),attach:event=>denverHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(denverHandlers.isFinalWithoutStory(event))await denverHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>denverHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>denverHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(denverHandlers.isFinalWithoutStory).map(event=>denverHandlers.attachArchiveStory(event)));if(sport==='Golf'&&denverHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(denverHandlers.isGolfAwaitingPlace).map(event=>denverHandlers.attachGolfPlace(event)));return events.filter(event=>!denverHandlers.isTennisWithoutStory(event)&&!denverHandlers.isGolfWithoutStory?.(event));}}
  ,{school:davidsonSchool,parseSchedule:(...args)=>davidsonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>davidsonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>davidsonHandlers.matchesRecap(...args),crossCountry:{matches:event=>davidsonHandlers.isCrossCountry(event),attach:event=>davidsonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(davidsonHandlers.isFinalWithoutStory(event))await davidsonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>davidsonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>davidsonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(davidsonHandlers.isFinalWithoutStory).map(event=>davidsonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&davidsonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(davidsonHandlers.isGolfAwaitingPlace).map(event=>davidsonHandlers.attachGolfPlace(event)));return events.filter(event=>!davidsonHandlers.isTennisWithoutStory(event)&&!davidsonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:duquesneSchool,parseSchedule:(...args)=>duquesneHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>duquesneHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>duquesneHandlers.matchesRecap(...args),crossCountry:{matches:event=>duquesneHandlers.isCrossCountry(event),attach:event=>duquesneHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(duquesneHandlers.isFinalWithoutStory(event))await duquesneHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>duquesneHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>duquesneHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(duquesneHandlers.isFinalWithoutStory).map(event=>duquesneHandlers.attachArchiveStory(event)));if(sport==='Golf'&&duquesneHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(duquesneHandlers.isGolfAwaitingPlace).map(event=>duquesneHandlers.attachGolfPlace(event)));return events.filter(event=>!duquesneHandlers.isTennisWithoutStory(event)&&!duquesneHandlers.isGolfWithoutStory?.(event));}}
  ,{school:fordhamSchool,parseSchedule:(...args)=>fordhamHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>fordhamHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>fordhamHandlers.matchesRecap(...args),crossCountry:{matches:event=>fordhamHandlers.isCrossCountry(event),attach:event=>fordhamHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(fordhamHandlers.isFinalWithoutStory(event))await fordhamHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>fordhamHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>fordhamHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(fordhamHandlers.isFinalWithoutStory).map(event=>fordhamHandlers.attachArchiveStory(event)));if(sport==='Golf'&&fordhamHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(fordhamHandlers.isGolfAwaitingPlace).map(event=>fordhamHandlers.attachGolfPlace(event)));return events.filter(event=>!fordhamHandlers.isTennisWithoutStory(event)&&!fordhamHandlers.isGolfWithoutStory?.(event));}}
  ,{school:georgeMasonSchool,parseSchedule:(...args)=>georgeMasonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>georgeMasonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>georgeMasonHandlers.matchesRecap(...args),crossCountry:{matches:event=>georgeMasonHandlers.isCrossCountry(event),attach:event=>georgeMasonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(georgeMasonHandlers.isFinalWithoutStory(event))await georgeMasonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>georgeMasonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>georgeMasonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(georgeMasonHandlers.isFinalWithoutStory).map(event=>georgeMasonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&georgeMasonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(georgeMasonHandlers.isGolfAwaitingPlace).map(event=>georgeMasonHandlers.attachGolfPlace(event)));return events.filter(event=>!georgeMasonHandlers.isTennisWithoutStory(event)&&!georgeMasonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:georgeWashingtonSchool,parseSchedule:(...args)=>georgeWashingtonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>georgeWashingtonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>georgeWashingtonHandlers.matchesRecap(...args),crossCountry:{matches:event=>georgeWashingtonHandlers.isCrossCountry(event),attach:event=>georgeWashingtonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(georgeWashingtonHandlers.isFinalWithoutStory(event))await georgeWashingtonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>georgeWashingtonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>georgeWashingtonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(georgeWashingtonHandlers.isFinalWithoutStory).map(event=>georgeWashingtonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&georgeWashingtonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(georgeWashingtonHandlers.isGolfAwaitingPlace).map(event=>georgeWashingtonHandlers.attachGolfPlace(event)));return events.filter(event=>!georgeWashingtonHandlers.isTennisWithoutStory(event)&&!georgeWashingtonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:laSalleSchool,parseSchedule:(...args)=>laSalleHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>laSalleHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>laSalleHandlers.matchesRecap(...args),crossCountry:{matches:event=>laSalleHandlers.isCrossCountry(event),attach:event=>laSalleHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(laSalleHandlers.isFinalWithoutStory(event))await laSalleHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>laSalleHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>laSalleHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(laSalleHandlers.isFinalWithoutStory).map(event=>laSalleHandlers.attachArchiveStory(event)));if(sport==='Golf'&&laSalleHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(laSalleHandlers.isGolfAwaitingPlace).map(event=>laSalleHandlers.attachGolfPlace(event)));return events.filter(event=>!laSalleHandlers.isTennisWithoutStory(event)&&!laSalleHandlers.isGolfWithoutStory?.(event));}}
  ,{school:rhodeIslandSchool,parseSchedule:(...args)=>rhodeIslandHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>rhodeIslandHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>rhodeIslandHandlers.matchesRecap(...args),crossCountry:{matches:event=>rhodeIslandHandlers.isCrossCountry(event),attach:event=>rhodeIslandHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(rhodeIslandHandlers.isFinalWithoutStory(event))await rhodeIslandHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>rhodeIslandHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>rhodeIslandHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(rhodeIslandHandlers.isFinalWithoutStory).map(event=>rhodeIslandHandlers.attachArchiveStory(event)));if(sport==='Golf'&&rhodeIslandHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(rhodeIslandHandlers.isGolfAwaitingPlace).map(event=>rhodeIslandHandlers.attachGolfPlace(event)));return events.filter(event=>!rhodeIslandHandlers.isTennisWithoutStory(event)&&!rhodeIslandHandlers.isGolfWithoutStory?.(event));}}
  ,{school:richmondSchool,parseSchedule:(...args)=>richmondHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>richmondHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>richmondHandlers.matchesRecap(...args),crossCountry:{matches:event=>richmondHandlers.isCrossCountry(event),attach:event=>richmondHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(richmondHandlers.isFinalWithoutStory(event))await richmondHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>richmondHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>richmondHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(richmondHandlers.isFinalWithoutStory).map(event=>richmondHandlers.attachArchiveStory(event)));if(sport==='Golf'&&richmondHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(richmondHandlers.isGolfAwaitingPlace).map(event=>richmondHandlers.attachGolfPlace(event)));return events.filter(event=>!richmondHandlers.isTennisWithoutStory(event)&&!richmondHandlers.isGolfWithoutStory?.(event));}}
  ,{school:saintJosephsSchool,parseSchedule:(...args)=>saintJosephsHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>saintJosephsHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>saintJosephsHandlers.matchesRecap(...args),crossCountry:{matches:event=>saintJosephsHandlers.isCrossCountry(event),attach:event=>saintJosephsHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(saintJosephsHandlers.isFinalWithoutStory(event))await saintJosephsHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>saintJosephsHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>saintJosephsHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(saintJosephsHandlers.isFinalWithoutStory).map(event=>saintJosephsHandlers.attachArchiveStory(event)));if(sport==='Golf'&&saintJosephsHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(saintJosephsHandlers.isGolfAwaitingPlace).map(event=>saintJosephsHandlers.attachGolfPlace(event)));return events.filter(event=>!saintJosephsHandlers.isTennisWithoutStory(event)&&!saintJosephsHandlers.isGolfWithoutStory?.(event));}}
  ,{school:saintLouisSchool,parseSchedule:(...args)=>saintLouisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>saintLouisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>saintLouisHandlers.matchesRecap(...args),crossCountry:{matches:event=>saintLouisHandlers.isCrossCountry(event),attach:event=>saintLouisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(saintLouisHandlers.isFinalWithoutStory(event))await saintLouisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>saintLouisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>saintLouisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(saintLouisHandlers.isFinalWithoutStory).map(event=>saintLouisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&saintLouisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(saintLouisHandlers.isGolfAwaitingPlace).map(event=>saintLouisHandlers.attachGolfPlace(event)));return events.filter(event=>!saintLouisHandlers.isTennisWithoutStory(event)&&!saintLouisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:evansvilleSchool,parseSchedule:(...args)=>evansvilleHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>evansvilleHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>evansvilleHandlers.matchesRecap(...args),crossCountry:{matches:event=>evansvilleHandlers.isCrossCountry(event),attach:event=>evansvilleHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(evansvilleHandlers.isFinalWithoutStory(event))await evansvilleHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>evansvilleHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>evansvilleHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(evansvilleHandlers.isFinalWithoutStory).map(event=>evansvilleHandlers.attachArchiveStory(event)));if(sport==='Golf'&&evansvilleHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(evansvilleHandlers.isGolfAwaitingPlace).map(event=>evansvilleHandlers.attachGolfPlace(event)));return events.filter(event=>!evansvilleHandlers.isTennisWithoutStory(event)&&!evansvilleHandlers.isGolfWithoutStory?.(event));}}
  ,{school:illinoisStateSchool,parseSchedule:(...args)=>illinoisStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>illinoisStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>illinoisStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>illinoisStateHandlers.isCrossCountry(event),attach:event=>illinoisStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(illinoisStateHandlers.isFinalWithoutStory(event))await illinoisStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>illinoisStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>illinoisStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(illinoisStateHandlers.isFinalWithoutStory).map(event=>illinoisStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&illinoisStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(illinoisStateHandlers.isGolfAwaitingPlace).map(event=>illinoisStateHandlers.attachGolfPlace(event)));return events.filter(event=>!illinoisStateHandlers.isTennisWithoutStory(event)&&!illinoisStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:indianaStateSchool,parseSchedule:(...args)=>indianaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>indianaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>indianaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>indianaStateHandlers.isCrossCountry(event),attach:event=>indianaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(indianaStateHandlers.isFinalWithoutStory(event))await indianaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>indianaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>indianaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(indianaStateHandlers.isFinalWithoutStory).map(event=>indianaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&indianaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(indianaStateHandlers.isGolfAwaitingPlace).map(event=>indianaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!indianaStateHandlers.isTennisWithoutStory(event)&&!indianaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:murrayStateSchool,parseSchedule:(...args)=>murrayStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>murrayStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>murrayStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>murrayStateHandlers.isCrossCountry(event),attach:event=>murrayStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(murrayStateHandlers.isFinalWithoutStory(event))await murrayStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>murrayStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>murrayStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(murrayStateHandlers.isFinalWithoutStory).map(event=>murrayStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&murrayStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(murrayStateHandlers.isGolfAwaitingPlace).map(event=>murrayStateHandlers.attachGolfPlace(event)));return events.filter(event=>!murrayStateHandlers.isTennisWithoutStory(event)&&!murrayStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northernIowaSchool,parseSchedule:(...args)=>northernIowaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northernIowaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northernIowaHandlers.matchesRecap(...args),crossCountry:{matches:event=>northernIowaHandlers.isCrossCountry(event),attach:event=>northernIowaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northernIowaHandlers.isFinalWithoutStory(event))await northernIowaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northernIowaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northernIowaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northernIowaHandlers.isFinalWithoutStory).map(event=>northernIowaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northernIowaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northernIowaHandlers.isGolfAwaitingPlace).map(event=>northernIowaHandlers.attachGolfPlace(event)));return events.filter(event=>!northernIowaHandlers.isTennisWithoutStory(event)&&!northernIowaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southernIllinoisSchool,parseSchedule:(...args)=>southernIllinoisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southernIllinoisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southernIllinoisHandlers.matchesRecap(...args),crossCountry:{matches:event=>southernIllinoisHandlers.isCrossCountry(event),attach:event=>southernIllinoisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southernIllinoisHandlers.isFinalWithoutStory(event))await southernIllinoisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southernIllinoisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southernIllinoisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southernIllinoisHandlers.isFinalWithoutStory).map(event=>southernIllinoisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southernIllinoisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southernIllinoisHandlers.isGolfAwaitingPlace).map(event=>southernIllinoisHandlers.attachGolfPlace(event)));return events.filter(event=>!southernIllinoisHandlers.isTennisWithoutStory(event)&&!southernIllinoisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:valparaisoSchool,parseSchedule:(...args)=>valparaisoHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>valparaisoHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>valparaisoHandlers.matchesRecap(...args),crossCountry:{matches:event=>valparaisoHandlers.isCrossCountry(event),attach:event=>valparaisoHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(valparaisoHandlers.isFinalWithoutStory(event))await valparaisoHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>valparaisoHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>valparaisoHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(valparaisoHandlers.isFinalWithoutStory).map(event=>valparaisoHandlers.attachArchiveStory(event)));if(sport==='Golf'&&valparaisoHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(valparaisoHandlers.isGolfAwaitingPlace).map(event=>valparaisoHandlers.attachGolfPlace(event)));return events.filter(event=>!valparaisoHandlers.isTennisWithoutStory(event)&&!valparaisoHandlers.isGolfWithoutStory?.(event));}}
  ,{school:belmontSchool,parseSchedule:(...args)=>belmontHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>belmontHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>belmontHandlers.matchesRecap(...args),crossCountry:{matches:event=>belmontHandlers.isCrossCountry(event),attach:event=>belmontHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(belmontHandlers.isFinalWithoutStory(event))await belmontHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>belmontHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>belmontHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(belmontHandlers.isFinalWithoutStory).map(event=>belmontHandlers.attachArchiveStory(event)));if(sport==='Golf'&&belmontHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(belmontHandlers.isGolfAwaitingPlace).map(event=>belmontHandlers.attachGolfPlace(event)));return events.filter(event=>!belmontHandlers.isTennisWithoutStory(event)&&!belmontHandlers.isGolfWithoutStory?.(event));}}
  ,{school:austinPeaySchool,parseSchedule:(...args)=>austinPeayHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>austinPeayHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>austinPeayHandlers.matchesRecap(...args),crossCountry:{matches:event=>austinPeayHandlers.isCrossCountry(event),attach:event=>austinPeayHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(austinPeayHandlers.isFinalWithoutStory(event))await austinPeayHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>austinPeayHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>austinPeayHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(austinPeayHandlers.isFinalWithoutStory).map(event=>austinPeayHandlers.attachArchiveStory(event)));if(sport==='Golf'&&austinPeayHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(austinPeayHandlers.isGolfAwaitingPlace).map(event=>austinPeayHandlers.attachGolfPlace(event)));return events.filter(event=>!austinPeayHandlers.isTennisWithoutStory(event)&&!austinPeayHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bellarmineSchool,parseSchedule:(...args)=>bellarmineHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bellarmineHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bellarmineHandlers.matchesRecap(...args),crossCountry:{matches:event=>bellarmineHandlers.isCrossCountry(event),attach:event=>bellarmineHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bellarmineHandlers.isFinalWithoutStory(event))await bellarmineHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bellarmineHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bellarmineHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bellarmineHandlers.isFinalWithoutStory).map(event=>bellarmineHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bellarmineHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bellarmineHandlers.isGolfAwaitingPlace).map(event=>bellarmineHandlers.attachGolfPlace(event)));return events.filter(event=>!bellarmineHandlers.isTennisWithoutStory(event)&&!bellarmineHandlers.isGolfWithoutStory?.(event));}}
  ,{school:centralArkansasSchool,parseSchedule:(...args)=>centralArkansasHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>centralArkansasHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>centralArkansasHandlers.matchesRecap(...args),crossCountry:{matches:event=>centralArkansasHandlers.isCrossCountry(event),attach:event=>centralArkansasHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(centralArkansasHandlers.isFinalWithoutStory(event))await centralArkansasHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>centralArkansasHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>centralArkansasHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(centralArkansasHandlers.isFinalWithoutStory).map(event=>centralArkansasHandlers.attachArchiveStory(event)));if(sport==='Golf'&&centralArkansasHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(centralArkansasHandlers.isGolfAwaitingPlace).map(event=>centralArkansasHandlers.attachGolfPlace(event)));return events.filter(event=>!centralArkansasHandlers.isTennisWithoutStory(event)&&!centralArkansasHandlers.isGolfWithoutStory?.(event));}}
  ,{school:easternKentuckySchool,parseSchedule:(...args)=>easternKentuckyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>easternKentuckyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>easternKentuckyHandlers.matchesRecap(...args),crossCountry:{matches:event=>easternKentuckyHandlers.isCrossCountry(event),attach:event=>easternKentuckyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(easternKentuckyHandlers.isFinalWithoutStory(event))await easternKentuckyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>easternKentuckyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>easternKentuckyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(easternKentuckyHandlers.isFinalWithoutStory).map(event=>easternKentuckyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&easternKentuckyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(easternKentuckyHandlers.isGolfAwaitingPlace).map(event=>easternKentuckyHandlers.attachGolfPlace(event)));return events.filter(event=>!easternKentuckyHandlers.isTennisWithoutStory(event)&&!easternKentuckyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:jacksonvilleSchool,parseSchedule:(...args)=>jacksonvilleHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>jacksonvilleHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>jacksonvilleHandlers.matchesRecap(...args),crossCountry:{matches:event=>jacksonvilleHandlers.isCrossCountry(event),attach:event=>jacksonvilleHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(jacksonvilleHandlers.isFinalWithoutStory(event))await jacksonvilleHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>jacksonvilleHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>jacksonvilleHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(jacksonvilleHandlers.isFinalWithoutStory).map(event=>jacksonvilleHandlers.attachArchiveStory(event)));if(sport==='Golf'&&jacksonvilleHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(jacksonvilleHandlers.isGolfAwaitingPlace).map(event=>jacksonvilleHandlers.attachGolfPlace(event)));return events.filter(event=>!jacksonvilleHandlers.isTennisWithoutStory(event)&&!jacksonvilleHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lipscombSchool,parseSchedule:(...args)=>lipscombHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lipscombHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lipscombHandlers.matchesRecap(...args),crossCountry:{matches:event=>lipscombHandlers.isCrossCountry(event),attach:event=>lipscombHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lipscombHandlers.isFinalWithoutStory(event))await lipscombHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lipscombHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lipscombHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lipscombHandlers.isFinalWithoutStory).map(event=>lipscombHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lipscombHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lipscombHandlers.isGolfAwaitingPlace).map(event=>lipscombHandlers.attachGolfPlace(event)));return events.filter(event=>!lipscombHandlers.isTennisWithoutStory(event)&&!lipscombHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northAlabamaSchool,parseSchedule:(...args)=>northAlabamaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northAlabamaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northAlabamaHandlers.matchesRecap(...args),crossCountry:{matches:event=>northAlabamaHandlers.isCrossCountry(event),attach:event=>northAlabamaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northAlabamaHandlers.isFinalWithoutStory(event))await northAlabamaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northAlabamaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northAlabamaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northAlabamaHandlers.isFinalWithoutStory).map(event=>northAlabamaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northAlabamaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northAlabamaHandlers.isGolfAwaitingPlace).map(event=>northAlabamaHandlers.attachGolfPlace(event)));return events.filter(event=>!northAlabamaHandlers.isTennisWithoutStory(event)&&!northAlabamaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northFloridaSchool,parseSchedule:(...args)=>northFloridaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northFloridaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northFloridaHandlers.matchesRecap(...args),crossCountry:{matches:event=>northFloridaHandlers.isCrossCountry(event),attach:event=>northFloridaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northFloridaHandlers.isFinalWithoutStory(event))await northFloridaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northFloridaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northFloridaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northFloridaHandlers.isFinalWithoutStory).map(event=>northFloridaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northFloridaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northFloridaHandlers.isGolfAwaitingPlace).map(event=>northFloridaHandlers.attachGolfPlace(event)));return events.filter(event=>!northFloridaHandlers.isTennisWithoutStory(event)&&!northFloridaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:queensSchool,parseSchedule:(...args)=>queensHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>queensHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>queensHandlers.matchesRecap(...args),crossCountry:{matches:event=>queensHandlers.isCrossCountry(event),attach:event=>queensHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(queensHandlers.isFinalWithoutStory(event))await queensHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>queensHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>queensHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(queensHandlers.isFinalWithoutStory).map(event=>queensHandlers.attachArchiveStory(event)));if(sport==='Golf'&&queensHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(queensHandlers.isGolfAwaitingPlace).map(event=>queensHandlers.attachGolfPlace(event)));return events.filter(event=>!queensHandlers.isTennisWithoutStory(event)&&!queensHandlers.isGolfWithoutStory?.(event));}}
  ,{school:westGeorgiaSchool,parseSchedule:(...args)=>westGeorgiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westGeorgiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westGeorgiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>westGeorgiaHandlers.isCrossCountry(event),attach:event=>westGeorgiaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westGeorgiaHandlers.isFinalWithoutStory(event))await westGeorgiaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>westGeorgiaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>westGeorgiaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(westGeorgiaHandlers.isFinalWithoutStory).map(event=>westGeorgiaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&westGeorgiaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(westGeorgiaHandlers.isGolfAwaitingPlace).map(event=>westGeorgiaHandlers.attachGolfPlace(event)));return events.filter(event=>!westGeorgiaHandlers.isTennisWithoutStory(event)&&!westGeorgiaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:abileneChristianSchool,parseSchedule:(...args)=>abileneChristianHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>abileneChristianHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>abileneChristianHandlers.matchesRecap(...args),crossCountry:{matches:event=>abileneChristianHandlers.isCrossCountry(event),attach:event=>abileneChristianHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(abileneChristianHandlers.isFinalWithoutStory(event))await abileneChristianHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>abileneChristianHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>abileneChristianHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(abileneChristianHandlers.isFinalWithoutStory).map(event=>abileneChristianHandlers.attachArchiveStory(event)));if(sport==='Golf'&&abileneChristianHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(abileneChristianHandlers.isGolfAwaitingPlace).map(event=>abileneChristianHandlers.attachGolfPlace(event)));return events.filter(event=>!abileneChristianHandlers.isTennisWithoutStory(event)&&!abileneChristianHandlers.isGolfWithoutStory?.(event));}}
  ,{school:tarletonStateSchool,parseSchedule:(...args)=>tarletonStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tarletonStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tarletonStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>tarletonStateHandlers.isCrossCountry(event),attach:event=>tarletonStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tarletonStateHandlers.isFinalWithoutStory(event))await tarletonStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>tarletonStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>tarletonStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(tarletonStateHandlers.isFinalWithoutStory).map(event=>tarletonStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&tarletonStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(tarletonStateHandlers.isGolfAwaitingPlace).map(event=>tarletonStateHandlers.attachGolfPlace(event)));return events.filter(event=>!tarletonStateHandlers.isTennisWithoutStory(event)&&!tarletonStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utArlingtonSchool,parseSchedule:(...args)=>utArlingtonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utArlingtonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utArlingtonHandlers.matchesRecap(...args),crossCountry:{matches:event=>utArlingtonHandlers.isCrossCountry(event),attach:event=>utArlingtonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utArlingtonHandlers.isFinalWithoutStory(event))await utArlingtonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utArlingtonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utArlingtonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utArlingtonHandlers.isFinalWithoutStory).map(event=>utArlingtonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utArlingtonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utArlingtonHandlers.isGolfAwaitingPlace).map(event=>utArlingtonHandlers.attachGolfPlace(event)));return events.filter(event=>!utArlingtonHandlers.isTennisWithoutStory(event)&&!utArlingtonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:westFloridaSchool,parseSchedule:(...args)=>westFloridaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westFloridaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westFloridaHandlers.matchesRecap(...args),crossCountry:{matches:event=>westFloridaHandlers.isCrossCountry(event),attach:event=>westFloridaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westFloridaHandlers.isFinalWithoutStory(event))await westFloridaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>westFloridaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>westFloridaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(westFloridaHandlers.isFinalWithoutStory).map(event=>westFloridaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&westFloridaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(westFloridaHandlers.isGolfAwaitingPlace).map(event=>westFloridaHandlers.attachGolfPlace(event)));return events.filter(event=>!westFloridaHandlers.isTennisWithoutStory(event)&&!westFloridaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ualbanySchool,parseSchedule:(...args)=>ualbanyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ualbanyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ualbanyHandlers.matchesRecap(...args),crossCountry:{matches:event=>ualbanyHandlers.isCrossCountry(event),attach:event=>ualbanyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ualbanyHandlers.isFinalWithoutStory(event))await ualbanyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ualbanyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ualbanyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ualbanyHandlers.isFinalWithoutStory).map(event=>ualbanyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ualbanyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ualbanyHandlers.isGolfAwaitingPlace).map(event=>ualbanyHandlers.attachGolfPlace(event)));return events.filter(event=>!ualbanyHandlers.isTennisWithoutStory(event)&&!ualbanyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:binghamtonSchool,parseSchedule:(...args)=>binghamtonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>binghamtonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>binghamtonHandlers.matchesRecap(...args),crossCountry:{matches:event=>binghamtonHandlers.isCrossCountry(event),attach:event=>binghamtonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(binghamtonHandlers.isFinalWithoutStory(event))await binghamtonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>binghamtonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>binghamtonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(binghamtonHandlers.isFinalWithoutStory).map(event=>binghamtonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&binghamtonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(binghamtonHandlers.isGolfAwaitingPlace).map(event=>binghamtonHandlers.attachGolfPlace(event)));return events.filter(event=>!binghamtonHandlers.isTennisWithoutStory(event)&&!binghamtonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bryantSchool,parseSchedule:(...args)=>bryantHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bryantHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bryantHandlers.matchesRecap(...args),crossCountry:{matches:event=>bryantHandlers.isCrossCountry(event),attach:event=>bryantHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bryantHandlers.isFinalWithoutStory(event))await bryantHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bryantHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bryantHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bryantHandlers.isFinalWithoutStory).map(event=>bryantHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bryantHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bryantHandlers.isGolfAwaitingPlace).map(event=>bryantHandlers.attachGolfPlace(event)));return events.filter(event=>!bryantHandlers.isTennisWithoutStory(event)&&!bryantHandlers.isGolfWithoutStory?.(event));}}
  ,{school:maineSchool,parseSchedule:(...args)=>maineHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>maineHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>maineHandlers.matchesRecap(...args),crossCountry:{matches:event=>maineHandlers.isCrossCountry(event),attach:event=>maineHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(maineHandlers.isFinalWithoutStory(event))await maineHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>maineHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>maineHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(maineHandlers.isFinalWithoutStory).map(event=>maineHandlers.attachArchiveStory(event)));if(sport==='Golf'&&maineHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(maineHandlers.isGolfAwaitingPlace).map(event=>maineHandlers.attachGolfPlace(event)));return events.filter(event=>!maineHandlers.isTennisWithoutStory(event)&&!maineHandlers.isGolfWithoutStory?.(event));}}
  ,{school:newHampshireSchool,parseSchedule:(...args)=>newHampshireHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>newHampshireHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>newHampshireHandlers.matchesRecap(...args),crossCountry:{matches:event=>newHampshireHandlers.isCrossCountry(event),attach:event=>newHampshireHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(newHampshireHandlers.isFinalWithoutStory(event))await newHampshireHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>newHampshireHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>newHampshireHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(newHampshireHandlers.isFinalWithoutStory).map(event=>newHampshireHandlers.attachArchiveStory(event)));if(sport==='Golf'&&newHampshireHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(newHampshireHandlers.isGolfAwaitingPlace).map(event=>newHampshireHandlers.attachGolfPlace(event)));return events.filter(event=>!newHampshireHandlers.isTennisWithoutStory(event)&&!newHampshireHandlers.isGolfWithoutStory?.(event));}}
  ,{school:njitSchool,parseSchedule:(...args)=>njitHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>njitHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>njitHandlers.matchesRecap(...args),crossCountry:{matches:event=>njitHandlers.isCrossCountry(event),attach:event=>njitHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(njitHandlers.isFinalWithoutStory(event))await njitHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>njitHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>njitHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(njitHandlers.isFinalWithoutStory).map(event=>njitHandlers.attachArchiveStory(event)));if(sport==='Golf'&&njitHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(njitHandlers.isGolfAwaitingPlace).map(event=>njitHandlers.attachGolfPlace(event)));return events.filter(event=>!njitHandlers.isTennisWithoutStory(event)&&!njitHandlers.isGolfWithoutStory?.(event));}}
  ,{school:umassLowellSchool,parseSchedule:(...args)=>umassLowellHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>umassLowellHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>umassLowellHandlers.matchesRecap(...args),crossCountry:{matches:event=>umassLowellHandlers.isCrossCountry(event),attach:event=>umassLowellHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(umassLowellHandlers.isFinalWithoutStory(event))await umassLowellHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>umassLowellHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>umassLowellHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(umassLowellHandlers.isFinalWithoutStory).map(event=>umassLowellHandlers.attachArchiveStory(event)));if(sport==='Golf'&&umassLowellHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(umassLowellHandlers.isGolfAwaitingPlace).map(event=>umassLowellHandlers.attachGolfPlace(event)));return events.filter(event=>!umassLowellHandlers.isTennisWithoutStory(event)&&!umassLowellHandlers.isGolfWithoutStory?.(event));}}
  ,{school:umbcSchool,parseSchedule:(...args)=>umbcHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>umbcHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>umbcHandlers.matchesRecap(...args),crossCountry:{matches:event=>umbcHandlers.isCrossCountry(event),attach:event=>umbcHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(umbcHandlers.isFinalWithoutStory(event))await umbcHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>umbcHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>umbcHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(umbcHandlers.isFinalWithoutStory).map(event=>umbcHandlers.attachArchiveStory(event)));if(sport==='Golf'&&umbcHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(umbcHandlers.isGolfAwaitingPlace).map(event=>umbcHandlers.attachGolfPlace(event)));return events.filter(event=>!umbcHandlers.isTennisWithoutStory(event)&&!umbcHandlers.isGolfWithoutStory?.(event));}}
  ,{school:charlestonSouthernSchool,parseSchedule:(...args)=>charlestonSouthernHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>charlestonSouthernHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>charlestonSouthernHandlers.matchesRecap(...args),crossCountry:{matches:event=>charlestonSouthernHandlers.isCrossCountry(event),attach:event=>charlestonSouthernHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(charlestonSouthernHandlers.isFinalWithoutStory(event))await charlestonSouthernHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>charlestonSouthernHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>charlestonSouthernHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(charlestonSouthernHandlers.isFinalWithoutStory).map(event=>charlestonSouthernHandlers.attachArchiveStory(event)));if(sport==='Golf'&&charlestonSouthernHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(charlestonSouthernHandlers.isGolfAwaitingPlace).map(event=>charlestonSouthernHandlers.attachGolfPlace(event)));return events.filter(event=>!charlestonSouthernHandlers.isTennisWithoutStory(event)&&!charlestonSouthernHandlers.isGolfWithoutStory?.(event));}}
  ,{school:gardnerWebbSchool,parseSchedule:(...args)=>gardnerWebbHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>gardnerWebbHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>gardnerWebbHandlers.matchesRecap(...args),crossCountry:{matches:event=>gardnerWebbHandlers.isCrossCountry(event),attach:event=>gardnerWebbHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(gardnerWebbHandlers.isFinalWithoutStory(event))await gardnerWebbHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>gardnerWebbHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>gardnerWebbHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(gardnerWebbHandlers.isFinalWithoutStory).map(event=>gardnerWebbHandlers.attachArchiveStory(event)));if(sport==='Golf'&&gardnerWebbHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(gardnerWebbHandlers.isGolfAwaitingPlace).map(event=>gardnerWebbHandlers.attachGolfPlace(event)));return events.filter(event=>!gardnerWebbHandlers.isTennisWithoutStory(event)&&!gardnerWebbHandlers.isGolfWithoutStory?.(event));}}
  ,{school:highPointSchool,parseSchedule:(...args)=>highPointHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>highPointHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>highPointHandlers.matchesRecap(...args),crossCountry:{matches:event=>highPointHandlers.isCrossCountry(event),attach:event=>highPointHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(highPointHandlers.isFinalWithoutStory(event))await highPointHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>highPointHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>highPointHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(highPointHandlers.isFinalWithoutStory).map(event=>highPointHandlers.attachArchiveStory(event)));if(sport==='Golf'&&highPointHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(highPointHandlers.isGolfAwaitingPlace).map(event=>highPointHandlers.attachGolfPlace(event)));return events.filter(event=>!highPointHandlers.isTennisWithoutStory(event)&&!highPointHandlers.isGolfWithoutStory?.(event));}}
  ,{school:presbyterianSchool,parseSchedule:(...args)=>presbyterianHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>presbyterianHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>presbyterianHandlers.matchesRecap(...args),crossCountry:{matches:event=>presbyterianHandlers.isCrossCountry(event),attach:event=>presbyterianHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(presbyterianHandlers.isFinalWithoutStory(event))await presbyterianHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>presbyterianHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>presbyterianHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(presbyterianHandlers.isFinalWithoutStory).map(event=>presbyterianHandlers.attachArchiveStory(event)));if(sport==='Golf'&&presbyterianHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(presbyterianHandlers.isGolfAwaitingPlace).map(event=>presbyterianHandlers.attachGolfPlace(event)));return events.filter(event=>!presbyterianHandlers.isTennisWithoutStory(event)&&!presbyterianHandlers.isGolfWithoutStory?.(event));}}
  ,{school:radfordSchool,parseSchedule:(...args)=>radfordHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>radfordHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>radfordHandlers.matchesRecap(...args),crossCountry:{matches:event=>radfordHandlers.isCrossCountry(event),attach:event=>radfordHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(radfordHandlers.isFinalWithoutStory(event))await radfordHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>radfordHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>radfordHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(radfordHandlers.isFinalWithoutStory).map(event=>radfordHandlers.attachArchiveStory(event)));if(sport==='Golf'&&radfordHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(radfordHandlers.isGolfAwaitingPlace).map(event=>radfordHandlers.attachGolfPlace(event)));return events.filter(event=>!radfordHandlers.isTennisWithoutStory(event)&&!radfordHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uncAshevilleSchool,parseSchedule:(...args)=>uncAshevilleHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uncAshevilleHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uncAshevilleHandlers.matchesRecap(...args),crossCountry:{matches:event=>uncAshevilleHandlers.isCrossCountry(event),attach:event=>uncAshevilleHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(uncAshevilleHandlers.isFinalWithoutStory(event))await uncAshevilleHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>uncAshevilleHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>uncAshevilleHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(uncAshevilleHandlers.isFinalWithoutStory).map(event=>uncAshevilleHandlers.attachArchiveStory(event)));if(sport==='Golf'&&uncAshevilleHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(uncAshevilleHandlers.isGolfAwaitingPlace).map(event=>uncAshevilleHandlers.attachGolfPlace(event)));return events.filter(event=>!uncAshevilleHandlers.isTennisWithoutStory(event)&&!uncAshevilleHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uscUpstateSchool,parseSchedule:(...args)=>uscUpstateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uscUpstateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uscUpstateHandlers.matchesRecap(...args),crossCountry:{matches:event=>uscUpstateHandlers.isCrossCountry(event),attach:event=>uscUpstateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(uscUpstateHandlers.isFinalWithoutStory(event))await uscUpstateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>uscUpstateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>uscUpstateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(uscUpstateHandlers.isFinalWithoutStory).map(event=>uscUpstateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&uscUpstateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(uscUpstateHandlers.isGolfAwaitingPlace).map(event=>uscUpstateHandlers.attachGolfPlace(event)));return events.filter(event=>!uscUpstateHandlers.isTennisWithoutStory(event)&&!uscUpstateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:winthropSchool,parseSchedule:(...args)=>winthropHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>winthropHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>winthropHandlers.matchesRecap(...args),crossCountry:{matches:event=>winthropHandlers.isCrossCountry(event),attach:event=>winthropHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(winthropHandlers.isFinalWithoutStory(event))await winthropHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>winthropHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>winthropHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(winthropHandlers.isFinalWithoutStory).map(event=>winthropHandlers.attachArchiveStory(event)));if(sport==='Golf'&&winthropHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(winthropHandlers.isGolfAwaitingPlace).map(event=>winthropHandlers.attachGolfPlace(event)));return events.filter(event=>!winthropHandlers.isTennisWithoutStory(event)&&!winthropHandlers.isGolfWithoutStory?.(event));}}
  ,{school:campbellSchool,parseSchedule:(...args)=>campbellHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>campbellHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>campbellHandlers.matchesRecap(...args),crossCountry:{matches:event=>campbellHandlers.isCrossCountry(event),attach:event=>campbellHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(campbellHandlers.isFinalWithoutStory(event))await campbellHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>campbellHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>campbellHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(campbellHandlers.isFinalWithoutStory).map(event=>campbellHandlers.attachArchiveStory(event)));if(sport==='Golf'&&campbellHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(campbellHandlers.isGolfAwaitingPlace).map(event=>campbellHandlers.attachGolfPlace(event)));return events.filter(event=>!campbellHandlers.isTennisWithoutStory(event)&&!campbellHandlers.isGolfWithoutStory?.(event));}}
  ,{school:charlestonSchool,parseSchedule:(...args)=>charlestonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>charlestonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>charlestonHandlers.matchesRecap(...args),crossCountry:{matches:event=>charlestonHandlers.isCrossCountry(event),attach:event=>charlestonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(charlestonHandlers.isFinalWithoutStory(event))await charlestonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>charlestonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>charlestonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(charlestonHandlers.isFinalWithoutStory).map(event=>charlestonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&charlestonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(charlestonHandlers.isGolfAwaitingPlace).map(event=>charlestonHandlers.attachGolfPlace(event)));return events.filter(event=>!charlestonHandlers.isTennisWithoutStory(event)&&!charlestonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:drexelSchool,parseSchedule:(...args)=>drexelHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>drexelHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>drexelHandlers.matchesRecap(...args),crossCountry:{matches:event=>drexelHandlers.isCrossCountry(event),attach:event=>drexelHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(drexelHandlers.isFinalWithoutStory(event))await drexelHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>drexelHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>drexelHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(drexelHandlers.isFinalWithoutStory).map(event=>drexelHandlers.attachArchiveStory(event)));if(sport==='Golf'&&drexelHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(drexelHandlers.isGolfAwaitingPlace).map(event=>drexelHandlers.attachGolfPlace(event)));return events.filter(event=>!drexelHandlers.isTennisWithoutStory(event)&&!drexelHandlers.isGolfWithoutStory?.(event));}}
  ,{school:elonSchool,parseSchedule:(...args)=>elonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>elonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>elonHandlers.matchesRecap(...args),crossCountry:{matches:event=>elonHandlers.isCrossCountry(event),attach:event=>elonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(elonHandlers.isFinalWithoutStory(event))await elonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>elonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>elonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(elonHandlers.isFinalWithoutStory).map(event=>elonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&elonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(elonHandlers.isGolfAwaitingPlace).map(event=>elonHandlers.attachGolfPlace(event)));return events.filter(event=>!elonHandlers.isTennisWithoutStory(event)&&!elonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:hamptonSchool,parseSchedule:(...args)=>hamptonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>hamptonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>hamptonHandlers.matchesRecap(...args),crossCountry:{matches:event=>hamptonHandlers.isCrossCountry(event),attach:event=>hamptonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(hamptonHandlers.isFinalWithoutStory(event))await hamptonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>hamptonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>hamptonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(hamptonHandlers.isFinalWithoutStory).map(event=>hamptonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&hamptonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(hamptonHandlers.isGolfAwaitingPlace).map(event=>hamptonHandlers.attachGolfPlace(event)));return events.filter(event=>!hamptonHandlers.isTennisWithoutStory(event)&&!hamptonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:hofstraSchool,parseSchedule:(...args)=>hofstraHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>hofstraHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>hofstraHandlers.matchesRecap(...args),crossCountry:{matches:event=>hofstraHandlers.isCrossCountry(event),attach:event=>hofstraHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(hofstraHandlers.isFinalWithoutStory(event))await hofstraHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>hofstraHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>hofstraHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(hofstraHandlers.isFinalWithoutStory).map(event=>hofstraHandlers.attachArchiveStory(event)));if(sport==='Golf'&&hofstraHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(hofstraHandlers.isGolfAwaitingPlace).map(event=>hofstraHandlers.attachGolfPlace(event)));return events.filter(event=>!hofstraHandlers.isTennisWithoutStory(event)&&!hofstraHandlers.isGolfWithoutStory?.(event));}}
  ,{school:monmouthSchool,parseSchedule:(...args)=>monmouthHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>monmouthHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>monmouthHandlers.matchesRecap(...args),crossCountry:{matches:event=>monmouthHandlers.isCrossCountry(event),attach:event=>monmouthHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(monmouthHandlers.isFinalWithoutStory(event))await monmouthHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>monmouthHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>monmouthHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(monmouthHandlers.isFinalWithoutStory).map(event=>monmouthHandlers.attachArchiveStory(event)));if(sport==='Golf'&&monmouthHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(monmouthHandlers.isGolfAwaitingPlace).map(event=>monmouthHandlers.attachGolfPlace(event)));return events.filter(event=>!monmouthHandlers.isTennisWithoutStory(event)&&!monmouthHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ncAtSchool,parseSchedule:(...args)=>ncAtHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ncAtHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ncAtHandlers.matchesRecap(...args),crossCountry:{matches:event=>ncAtHandlers.isCrossCountry(event),attach:event=>ncAtHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ncAtHandlers.isFinalWithoutStory(event))await ncAtHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ncAtHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ncAtHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ncAtHandlers.isFinalWithoutStory).map(event=>ncAtHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ncAtHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ncAtHandlers.isGolfAwaitingPlace).map(event=>ncAtHandlers.attachGolfPlace(event)));return events.filter(event=>!ncAtHandlers.isTennisWithoutStory(event)&&!ncAtHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stonyBrookSchool,parseSchedule:(...args)=>stonyBrookHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stonyBrookHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stonyBrookHandlers.matchesRecap(...args),crossCountry:{matches:event=>stonyBrookHandlers.isCrossCountry(event),attach:event=>stonyBrookHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(stonyBrookHandlers.isFinalWithoutStory(event))await stonyBrookHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>stonyBrookHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>stonyBrookHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(stonyBrookHandlers.isFinalWithoutStory).map(event=>stonyBrookHandlers.attachArchiveStory(event)));if(sport==='Golf'&&stonyBrookHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(stonyBrookHandlers.isGolfAwaitingPlace).map(event=>stonyBrookHandlers.attachGolfPlace(event)));return events.filter(event=>!stonyBrookHandlers.isTennisWithoutStory(event)&&!stonyBrookHandlers.isGolfWithoutStory?.(event));}}
  ,{school:towsonSchool,parseSchedule:(...args)=>towsonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>towsonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>towsonHandlers.matchesRecap(...args),crossCountry:{matches:event=>towsonHandlers.isCrossCountry(event),attach:event=>towsonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(towsonHandlers.isFinalWithoutStory(event))await towsonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>towsonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>towsonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(towsonHandlers.isFinalWithoutStory).map(event=>towsonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&towsonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(towsonHandlers.isGolfAwaitingPlace).map(event=>towsonHandlers.attachGolfPlace(event)));return events.filter(event=>!towsonHandlers.isTennisWithoutStory(event)&&!towsonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:williamMarySchool,parseSchedule:(...args)=>williamMaryHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>williamMaryHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>williamMaryHandlers.matchesRecap(...args),crossCountry:{matches:event=>williamMaryHandlers.isCrossCountry(event),attach:event=>williamMaryHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(williamMaryHandlers.isFinalWithoutStory(event))await williamMaryHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>williamMaryHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>williamMaryHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(williamMaryHandlers.isFinalWithoutStory).map(event=>williamMaryHandlers.attachArchiveStory(event)));if(sport==='Golf'&&williamMaryHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(williamMaryHandlers.isGolfAwaitingPlace).map(event=>williamMaryHandlers.attachGolfPlace(event)));return events.filter(event=>!williamMaryHandlers.isTennisWithoutStory(event)&&!williamMaryHandlers.isGolfWithoutStory?.(event));}}
  ,{school:clevelandStateSchool,parseSchedule:(...args)=>clevelandStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>clevelandStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>clevelandStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>clevelandStateHandlers.isCrossCountry(event),attach:event=>clevelandStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(clevelandStateHandlers.isFinalWithoutStory(event))await clevelandStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>clevelandStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>clevelandStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(clevelandStateHandlers.isFinalWithoutStory).map(event=>clevelandStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&clevelandStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(clevelandStateHandlers.isGolfAwaitingPlace).map(event=>clevelandStateHandlers.attachGolfPlace(event)));return events.filter(event=>!clevelandStateHandlers.isTennisWithoutStory(event)&&!clevelandStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:detroitMercySchool,parseSchedule:(...args)=>detroitMercyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>detroitMercyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>detroitMercyHandlers.matchesRecap(...args),crossCountry:{matches:event=>detroitMercyHandlers.isCrossCountry(event),attach:event=>detroitMercyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(detroitMercyHandlers.isFinalWithoutStory(event))await detroitMercyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>detroitMercyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>detroitMercyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(detroitMercyHandlers.isFinalWithoutStory).map(event=>detroitMercyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&detroitMercyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(detroitMercyHandlers.isGolfAwaitingPlace).map(event=>detroitMercyHandlers.attachGolfPlace(event)));return events.filter(event=>!detroitMercyHandlers.isTennisWithoutStory(event)&&!detroitMercyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:greenBaySchool,parseSchedule:(...args)=>greenBayHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>greenBayHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>greenBayHandlers.matchesRecap(...args),crossCountry:{matches:event=>greenBayHandlers.isCrossCountry(event),attach:event=>greenBayHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(greenBayHandlers.isFinalWithoutStory(event))await greenBayHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>greenBayHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>greenBayHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(greenBayHandlers.isFinalWithoutStory).map(event=>greenBayHandlers.attachArchiveStory(event)));if(sport==='Golf'&&greenBayHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(greenBayHandlers.isGolfAwaitingPlace).map(event=>greenBayHandlers.attachGolfPlace(event)));return events.filter(event=>!greenBayHandlers.isTennisWithoutStory(event)&&!greenBayHandlers.isGolfWithoutStory?.(event));}}
  ,{school:iuIndySchool,parseSchedule:(...args)=>iuIndyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>iuIndyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>iuIndyHandlers.matchesRecap(...args),crossCountry:{matches:event=>iuIndyHandlers.isCrossCountry(event),attach:event=>iuIndyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(iuIndyHandlers.isFinalWithoutStory(event))await iuIndyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>iuIndyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>iuIndyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(iuIndyHandlers.isFinalWithoutStory).map(event=>iuIndyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&iuIndyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(iuIndyHandlers.isGolfAwaitingPlace).map(event=>iuIndyHandlers.attachGolfPlace(event)));return events.filter(event=>!iuIndyHandlers.isTennisWithoutStory(event)&&!iuIndyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:milwaukeeSchool,parseSchedule:(...args)=>milwaukeeHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>milwaukeeHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>milwaukeeHandlers.matchesRecap(...args),crossCountry:{matches:event=>milwaukeeHandlers.isCrossCountry(event),attach:event=>milwaukeeHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(milwaukeeHandlers.isFinalWithoutStory(event))await milwaukeeHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>milwaukeeHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>milwaukeeHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(milwaukeeHandlers.isFinalWithoutStory).map(event=>milwaukeeHandlers.attachArchiveStory(event)));if(sport==='Golf'&&milwaukeeHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(milwaukeeHandlers.isGolfAwaitingPlace).map(event=>milwaukeeHandlers.attachGolfPlace(event)));return events.filter(event=>!milwaukeeHandlers.isTennisWithoutStory(event)&&!milwaukeeHandlers.isGolfWithoutStory?.(event));}}
  ,{school:purdueFortWayneSchool,parseSchedule:(...args)=>purdueFortWayneHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>purdueFortWayneHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>purdueFortWayneHandlers.matchesRecap(...args),crossCountry:{matches:event=>purdueFortWayneHandlers.isCrossCountry(event),attach:event=>purdueFortWayneHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(purdueFortWayneHandlers.isFinalWithoutStory(event))await purdueFortWayneHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>purdueFortWayneHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>purdueFortWayneHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(purdueFortWayneHandlers.isFinalWithoutStory).map(event=>purdueFortWayneHandlers.attachArchiveStory(event)));if(sport==='Golf'&&purdueFortWayneHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(purdueFortWayneHandlers.isGolfAwaitingPlace).map(event=>purdueFortWayneHandlers.attachGolfPlace(event)));return events.filter(event=>!purdueFortWayneHandlers.isTennisWithoutStory(event)&&!purdueFortWayneHandlers.isGolfWithoutStory?.(event));}}
  ,{school:robertMorrisSchool,parseSchedule:(...args)=>robertMorrisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>robertMorrisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>robertMorrisHandlers.matchesRecap(...args),crossCountry:{matches:event=>robertMorrisHandlers.isCrossCountry(event),attach:event=>robertMorrisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(robertMorrisHandlers.isFinalWithoutStory(event))await robertMorrisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>robertMorrisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>robertMorrisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(robertMorrisHandlers.isFinalWithoutStory).map(event=>robertMorrisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&robertMorrisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(robertMorrisHandlers.isGolfAwaitingPlace).map(event=>robertMorrisHandlers.attachGolfPlace(event)));return events.filter(event=>!robertMorrisHandlers.isTennisWithoutStory(event)&&!robertMorrisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:wrightStateSchool,parseSchedule:(...args)=>wrightStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>wrightStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>wrightStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>wrightStateHandlers.isCrossCountry(event),attach:event=>wrightStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(wrightStateHandlers.isFinalWithoutStory(event))await wrightStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>wrightStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>wrightStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(wrightStateHandlers.isFinalWithoutStory).map(event=>wrightStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&wrightStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(wrightStateHandlers.isGolfAwaitingPlace).map(event=>wrightStateHandlers.attachGolfPlace(event)));return events.filter(event=>!wrightStateHandlers.isTennisWithoutStory(event)&&!wrightStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:youngstownStateSchool,parseSchedule:(...args)=>youngstownStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>youngstownStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>youngstownStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>youngstownStateHandlers.isCrossCountry(event),attach:event=>youngstownStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(youngstownStateHandlers.isFinalWithoutStory(event))await youngstownStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>youngstownStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>youngstownStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(youngstownStateHandlers.isFinalWithoutStory).map(event=>youngstownStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&youngstownStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(youngstownStateHandlers.isGolfAwaitingPlace).map(event=>youngstownStateHandlers.attachGolfPlace(event)));return events.filter(event=>!youngstownStateHandlers.isTennisWithoutStory(event)&&!youngstownStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northernIllinoisSchool,parseSchedule:(...args)=>northernIllinoisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northernIllinoisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northernIllinoisHandlers.matchesRecap(...args),crossCountry:{matches:event=>northernIllinoisHandlers.isCrossCountry(event),attach:event=>northernIllinoisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northernIllinoisHandlers.isFinalWithoutStory(event))await northernIllinoisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northernIllinoisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northernIllinoisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northernIllinoisHandlers.isFinalWithoutStory).map(event=>northernIllinoisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northernIllinoisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northernIllinoisHandlers.isGolfAwaitingPlace).map(event=>northernIllinoisHandlers.attachGolfPlace(event)));return events.filter(event=>!northernIllinoisHandlers.isTennisWithoutStory(event)&&!northernIllinoisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:brownSchool,parseSchedule:(...args)=>brownHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>brownHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>brownHandlers.matchesRecap(...args),crossCountry:{matches:event=>brownHandlers.isCrossCountry(event),attach:event=>brownHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(brownHandlers.isFinalWithoutStory(event))await brownHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>brownHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>brownHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(brownHandlers.isFinalWithoutStory).map(event=>brownHandlers.attachArchiveStory(event)));if(sport==='Golf'&&brownHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(brownHandlers.isGolfAwaitingPlace).map(event=>brownHandlers.attachGolfPlace(event)));return events.filter(event=>!brownHandlers.isTennisWithoutStory(event)&&!brownHandlers.isGolfWithoutStory?.(event));}}
  ,{school:columbiaSchool,parseSchedule:(...args)=>columbiaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>columbiaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>columbiaHandlers.matchesRecap(...args),crossCountry:{matches:event=>columbiaHandlers.isCrossCountry(event),attach:event=>columbiaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(columbiaHandlers.isFinalWithoutStory(event))await columbiaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>columbiaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>columbiaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(columbiaHandlers.isFinalWithoutStory).map(event=>columbiaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&columbiaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(columbiaHandlers.isGolfAwaitingPlace).map(event=>columbiaHandlers.attachGolfPlace(event)));return events.filter(event=>!columbiaHandlers.isTennisWithoutStory(event)&&!columbiaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:cornellSchool,parseSchedule:(...args)=>cornellHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>cornellHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>cornellHandlers.matchesRecap(...args),crossCountry:{matches:event=>cornellHandlers.isCrossCountry(event),attach:event=>cornellHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(cornellHandlers.isFinalWithoutStory(event))await cornellHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>cornellHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>cornellHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(cornellHandlers.isFinalWithoutStory).map(event=>cornellHandlers.attachArchiveStory(event)));if(sport==='Golf'&&cornellHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(cornellHandlers.isGolfAwaitingPlace).map(event=>cornellHandlers.attachGolfPlace(event)));return events.filter(event=>!cornellHandlers.isTennisWithoutStory(event)&&!cornellHandlers.isGolfWithoutStory?.(event));}}
  ,{school:dartmouthSchool,parseSchedule:(...args)=>dartmouthHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>dartmouthHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>dartmouthHandlers.matchesRecap(...args),crossCountry:{matches:event=>dartmouthHandlers.isCrossCountry(event),attach:event=>dartmouthHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(dartmouthHandlers.isFinalWithoutStory(event))await dartmouthHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>dartmouthHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>dartmouthHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(dartmouthHandlers.isFinalWithoutStory).map(event=>dartmouthHandlers.attachArchiveStory(event)));if(sport==='Golf'&&dartmouthHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(dartmouthHandlers.isGolfAwaitingPlace).map(event=>dartmouthHandlers.attachGolfPlace(event)));return events.filter(event=>!dartmouthHandlers.isTennisWithoutStory(event)&&!dartmouthHandlers.isGolfWithoutStory?.(event));}}
  ,{school:pennSchool,parseSchedule:(...args)=>pennHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>pennHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>pennHandlers.matchesRecap(...args),crossCountry:{matches:event=>pennHandlers.isCrossCountry(event),attach:event=>pennHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(pennHandlers.isFinalWithoutStory(event))await pennHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>pennHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>pennHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(pennHandlers.isFinalWithoutStory).map(event=>pennHandlers.attachArchiveStory(event)));if(sport==='Golf'&&pennHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(pennHandlers.isGolfAwaitingPlace).map(event=>pennHandlers.attachGolfPlace(event)));return events.filter(event=>!pennHandlers.isTennisWithoutStory(event)&&!pennHandlers.isGolfWithoutStory?.(event));}}
  ,{school:princetonSchool,parseSchedule:(...args)=>princetonHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>princetonHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>princetonHandlers.matchesRecap(...args),crossCountry:{matches:event=>princetonHandlers.isCrossCountry(event),attach:event=>princetonHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(princetonHandlers.isFinalWithoutStory(event))await princetonHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>princetonHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>princetonHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(princetonHandlers.isFinalWithoutStory).map(event=>princetonHandlers.attachArchiveStory(event)));if(sport==='Golf'&&princetonHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(princetonHandlers.isGolfAwaitingPlace).map(event=>princetonHandlers.attachGolfPlace(event)));return events.filter(event=>!princetonHandlers.isTennisWithoutStory(event)&&!princetonHandlers.isGolfWithoutStory?.(event));}}
  ,{school:fairfieldSchool,parseSchedule:(...args)=>fairfieldHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>fairfieldHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>fairfieldHandlers.matchesRecap(...args),crossCountry:{matches:event=>fairfieldHandlers.isCrossCountry(event),attach:event=>fairfieldHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(fairfieldHandlers.isFinalWithoutStory(event))await fairfieldHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>fairfieldHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>fairfieldHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(fairfieldHandlers.isFinalWithoutStory).map(event=>fairfieldHandlers.attachArchiveStory(event)));if(sport==='Golf'&&fairfieldHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(fairfieldHandlers.isGolfAwaitingPlace).map(event=>fairfieldHandlers.attachGolfPlace(event)));return events.filter(event=>!fairfieldHandlers.isTennisWithoutStory(event)&&!fairfieldHandlers.isGolfWithoutStory?.(event));}}
  ,{school:manhattanSchool,parseSchedule:(...args)=>manhattanHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>manhattanHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>manhattanHandlers.matchesRecap(...args),crossCountry:{matches:event=>manhattanHandlers.isCrossCountry(event),attach:event=>manhattanHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(manhattanHandlers.isFinalWithoutStory(event))await manhattanHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>manhattanHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>manhattanHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(manhattanHandlers.isFinalWithoutStory).map(event=>manhattanHandlers.attachArchiveStory(event)));if(sport==='Golf'&&manhattanHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(manhattanHandlers.isGolfAwaitingPlace).map(event=>manhattanHandlers.attachGolfPlace(event)));return events.filter(event=>!manhattanHandlers.isTennisWithoutStory(event)&&!manhattanHandlers.isGolfWithoutStory?.(event));}}
  ,{school:maristSchool,parseSchedule:(...args)=>maristHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>maristHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>maristHandlers.matchesRecap(...args),crossCountry:{matches:event=>maristHandlers.isCrossCountry(event),attach:event=>maristHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(maristHandlers.isFinalWithoutStory(event))await maristHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>maristHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>maristHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(maristHandlers.isFinalWithoutStory).map(event=>maristHandlers.attachArchiveStory(event)));if(sport==='Golf'&&maristHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(maristHandlers.isGolfAwaitingPlace).map(event=>maristHandlers.attachGolfPlace(event)));return events.filter(event=>!maristHandlers.isTennisWithoutStory(event)&&!maristHandlers.isGolfWithoutStory?.(event));}}
  ,{school:merrimackSchool,parseSchedule:(...args)=>merrimackHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>merrimackHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>merrimackHandlers.matchesRecap(...args),crossCountry:{matches:event=>merrimackHandlers.isCrossCountry(event),attach:event=>merrimackHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(merrimackHandlers.isFinalWithoutStory(event))await merrimackHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>merrimackHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>merrimackHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(merrimackHandlers.isFinalWithoutStory).map(event=>merrimackHandlers.attachArchiveStory(event)));if(sport==='Golf'&&merrimackHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(merrimackHandlers.isGolfAwaitingPlace).map(event=>merrimackHandlers.attachGolfPlace(event)));return events.filter(event=>!merrimackHandlers.isTennisWithoutStory(event)&&!merrimackHandlers.isGolfWithoutStory?.(event));}}
  ,{school:mountStMarysSchool,parseSchedule:(...args)=>mountStMarysHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mountStMarysHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mountStMarysHandlers.matchesRecap(...args),crossCountry:{matches:event=>mountStMarysHandlers.isCrossCountry(event),attach:event=>mountStMarysHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mountStMarysHandlers.isFinalWithoutStory(event))await mountStMarysHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>mountStMarysHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>mountStMarysHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(mountStMarysHandlers.isFinalWithoutStory).map(event=>mountStMarysHandlers.attachArchiveStory(event)));if(sport==='Golf'&&mountStMarysHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(mountStMarysHandlers.isGolfAwaitingPlace).map(event=>mountStMarysHandlers.attachGolfPlace(event)));return events.filter(event=>!mountStMarysHandlers.isTennisWithoutStory(event)&&!mountStMarysHandlers.isGolfWithoutStory?.(event));}}
  ,{school:niagaraSchool,parseSchedule:(...args)=>niagaraHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>niagaraHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>niagaraHandlers.matchesRecap(...args),crossCountry:{matches:event=>niagaraHandlers.isCrossCountry(event),attach:event=>niagaraHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(niagaraHandlers.isFinalWithoutStory(event))await niagaraHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>niagaraHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>niagaraHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(niagaraHandlers.isFinalWithoutStory).map(event=>niagaraHandlers.attachArchiveStory(event)));if(sport==='Golf'&&niagaraHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(niagaraHandlers.isGolfAwaitingPlace).map(event=>niagaraHandlers.attachGolfPlace(event)));return events.filter(event=>!niagaraHandlers.isTennisWithoutStory(event)&&!niagaraHandlers.isGolfWithoutStory?.(event));}}
  ,{school:quinnipiacSchool,parseSchedule:(...args)=>quinnipiacHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>quinnipiacHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>quinnipiacHandlers.matchesRecap(...args),crossCountry:{matches:event=>quinnipiacHandlers.isCrossCountry(event),attach:event=>quinnipiacHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(quinnipiacHandlers.isFinalWithoutStory(event))await quinnipiacHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>quinnipiacHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>quinnipiacHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(quinnipiacHandlers.isFinalWithoutStory).map(event=>quinnipiacHandlers.attachArchiveStory(event)));if(sport==='Golf'&&quinnipiacHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(quinnipiacHandlers.isGolfAwaitingPlace).map(event=>quinnipiacHandlers.attachGolfPlace(event)));return events.filter(event=>!quinnipiacHandlers.isTennisWithoutStory(event)&&!quinnipiacHandlers.isGolfWithoutStory?.(event));}}
  ,{school:riderSchool,parseSchedule:(...args)=>riderHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>riderHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>riderHandlers.matchesRecap(...args),crossCountry:{matches:event=>riderHandlers.isCrossCountry(event),attach:event=>riderHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(riderHandlers.isFinalWithoutStory(event))await riderHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>riderHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>riderHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(riderHandlers.isFinalWithoutStory).map(event=>riderHandlers.attachArchiveStory(event)));if(sport==='Golf'&&riderHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(riderHandlers.isGolfAwaitingPlace).map(event=>riderHandlers.attachGolfPlace(event)));return events.filter(event=>!riderHandlers.isTennisWithoutStory(event)&&!riderHandlers.isGolfWithoutStory?.(event));}}
  ,{school:sacredHeartSchool,parseSchedule:(...args)=>sacredHeartHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sacredHeartHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sacredHeartHandlers.matchesRecap(...args),crossCountry:{matches:event=>sacredHeartHandlers.isCrossCountry(event),attach:event=>sacredHeartHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(sacredHeartHandlers.isFinalWithoutStory(event))await sacredHeartHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>sacredHeartHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>sacredHeartHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(sacredHeartHandlers.isFinalWithoutStory).map(event=>sacredHeartHandlers.attachArchiveStory(event)));if(sport==='Golf'&&sacredHeartHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(sacredHeartHandlers.isGolfAwaitingPlace).map(event=>sacredHeartHandlers.attachGolfPlace(event)));return events.filter(event=>!sacredHeartHandlers.isTennisWithoutStory(event)&&!sacredHeartHandlers.isGolfWithoutStory?.(event));}}
  ,{school:sienaSchool,parseSchedule:(...args)=>sienaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>sienaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>sienaHandlers.matchesRecap(...args),crossCountry:{matches:event=>sienaHandlers.isCrossCountry(event),attach:event=>sienaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(sienaHandlers.isFinalWithoutStory(event))await sienaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>sienaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>sienaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(sienaHandlers.isFinalWithoutStory).map(event=>sienaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&sienaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(sienaHandlers.isGolfAwaitingPlace).map(event=>sienaHandlers.attachGolfPlace(event)));return events.filter(event=>!sienaHandlers.isTennisWithoutStory(event)&&!sienaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:coppinStateSchool,parseSchedule:(...args)=>coppinStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>coppinStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>coppinStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>coppinStateHandlers.isCrossCountry(event),attach:event=>coppinStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(coppinStateHandlers.isFinalWithoutStory(event))await coppinStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>coppinStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>coppinStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(coppinStateHandlers.isFinalWithoutStory).map(event=>coppinStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&coppinStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(coppinStateHandlers.isGolfAwaitingPlace).map(event=>coppinStateHandlers.attachGolfPlace(event)));return events.filter(event=>!coppinStateHandlers.isTennisWithoutStory(event)&&!coppinStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:delawareStateSchool,parseSchedule:(...args)=>delawareStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>delawareStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>delawareStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>delawareStateHandlers.isCrossCountry(event),attach:event=>delawareStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(delawareStateHandlers.isFinalWithoutStory(event))await delawareStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>delawareStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>delawareStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(delawareStateHandlers.isFinalWithoutStory).map(event=>delawareStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&delawareStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(delawareStateHandlers.isGolfAwaitingPlace).map(event=>delawareStateHandlers.attachGolfPlace(event)));return events.filter(event=>!delawareStateHandlers.isTennisWithoutStory(event)&&!delawareStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:marylandEasternShoreSchool,parseSchedule:(...args)=>marylandEasternShoreHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>marylandEasternShoreHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>marylandEasternShoreHandlers.matchesRecap(...args),crossCountry:{matches:event=>marylandEasternShoreHandlers.isCrossCountry(event),attach:event=>marylandEasternShoreHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(marylandEasternShoreHandlers.isFinalWithoutStory(event))await marylandEasternShoreHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>marylandEasternShoreHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>marylandEasternShoreHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(marylandEasternShoreHandlers.isFinalWithoutStory).map(event=>marylandEasternShoreHandlers.attachArchiveStory(event)));if(sport==='Golf'&&marylandEasternShoreHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(marylandEasternShoreHandlers.isGolfAwaitingPlace).map(event=>marylandEasternShoreHandlers.attachGolfPlace(event)));return events.filter(event=>!marylandEasternShoreHandlers.isTennisWithoutStory(event)&&!marylandEasternShoreHandlers.isGolfWithoutStory?.(event));}}
  ,{school:morganStateSchool,parseSchedule:(...args)=>morganStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>morganStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>morganStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>morganStateHandlers.isCrossCountry(event),attach:event=>morganStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(morganStateHandlers.isFinalWithoutStory(event))await morganStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>morganStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>morganStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(morganStateHandlers.isFinalWithoutStory).map(event=>morganStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&morganStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(morganStateHandlers.isGolfAwaitingPlace).map(event=>morganStateHandlers.attachGolfPlace(event)));return events.filter(event=>!morganStateHandlers.isTennisWithoutStory(event)&&!morganStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:norfolkStateSchool,parseSchedule:(...args)=>norfolkStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>norfolkStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>norfolkStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>norfolkStateHandlers.isCrossCountry(event),attach:event=>norfolkStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(norfolkStateHandlers.isFinalWithoutStory(event))await norfolkStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>norfolkStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>norfolkStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(norfolkStateHandlers.isFinalWithoutStory).map(event=>norfolkStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&norfolkStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(norfolkStateHandlers.isGolfAwaitingPlace).map(event=>norfolkStateHandlers.attachGolfPlace(event)));return events.filter(event=>!norfolkStateHandlers.isTennisWithoutStory(event)&&!norfolkStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:ncCentralSchool,parseSchedule:(...args)=>ncCentralHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>ncCentralHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>ncCentralHandlers.matchesRecap(...args),crossCountry:{matches:event=>ncCentralHandlers.isCrossCountry(event),attach:event=>ncCentralHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(ncCentralHandlers.isFinalWithoutStory(event))await ncCentralHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>ncCentralHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>ncCentralHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(ncCentralHandlers.isFinalWithoutStory).map(event=>ncCentralHandlers.attachArchiveStory(event)));if(sport==='Golf'&&ncCentralHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(ncCentralHandlers.isGolfAwaitingPlace).map(event=>ncCentralHandlers.attachGolfPlace(event)));return events.filter(event=>!ncCentralHandlers.isTennisWithoutStory(event)&&!ncCentralHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southCarolinaStateSchool,parseSchedule:(...args)=>southCarolinaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southCarolinaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southCarolinaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>southCarolinaStateHandlers.isCrossCountry(event),attach:event=>southCarolinaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southCarolinaStateHandlers.isFinalWithoutStory(event))await southCarolinaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southCarolinaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southCarolinaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southCarolinaStateHandlers.isFinalWithoutStory).map(event=>southCarolinaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southCarolinaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southCarolinaStateHandlers.isGolfAwaitingPlace).map(event=>southCarolinaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!southCarolinaStateHandlers.isTennisWithoutStory(event)&&!southCarolinaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:chicagoStateSchool,parseSchedule:(...args)=>chicagoStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>chicagoStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>chicagoStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>chicagoStateHandlers.isCrossCountry(event),attach:event=>chicagoStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(chicagoStateHandlers.isFinalWithoutStory(event))await chicagoStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>chicagoStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>chicagoStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(chicagoStateHandlers.isFinalWithoutStory).map(event=>chicagoStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&chicagoStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(chicagoStateHandlers.isGolfAwaitingPlace).map(event=>chicagoStateHandlers.attachGolfPlace(event)));return events.filter(event=>!chicagoStateHandlers.isTennisWithoutStory(event)&&!chicagoStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:leMoyneSchool,parseSchedule:(...args)=>leMoyneHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>leMoyneHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>leMoyneHandlers.matchesRecap(...args),crossCountry:{matches:event=>leMoyneHandlers.isCrossCountry(event),attach:event=>leMoyneHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(leMoyneHandlers.isFinalWithoutStory(event))await leMoyneHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>leMoyneHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>leMoyneHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(leMoyneHandlers.isFinalWithoutStory).map(event=>leMoyneHandlers.attachArchiveStory(event)));if(sport==='Golf'&&leMoyneHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(leMoyneHandlers.isGolfAwaitingPlace).map(event=>leMoyneHandlers.attachGolfPlace(event)));return events.filter(event=>!leMoyneHandlers.isTennisWithoutStory(event)&&!leMoyneHandlers.isGolfWithoutStory?.(event));}}
  ,{school:liuSchool,parseSchedule:(...args)=>liuHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>liuHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>liuHandlers.matchesRecap(...args),crossCountry:{matches:event=>liuHandlers.isCrossCountry(event),attach:event=>liuHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(liuHandlers.isFinalWithoutStory(event))await liuHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>liuHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>liuHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(liuHandlers.isFinalWithoutStory).map(event=>liuHandlers.attachArchiveStory(event)));if(sport==='Golf'&&liuHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(liuHandlers.isGolfAwaitingPlace).map(event=>liuHandlers.attachGolfPlace(event)));return events.filter(event=>!liuHandlers.isTennisWithoutStory(event)&&!liuHandlers.isGolfWithoutStory?.(event));}}
  ,{school:mercyhurstSchool,parseSchedule:(...args)=>mercyhurstHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mercyhurstHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mercyhurstHandlers.matchesRecap(...args),crossCountry:{matches:event=>mercyhurstHandlers.isCrossCountry(event),attach:event=>mercyhurstHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mercyhurstHandlers.isFinalWithoutStory(event))await mercyhurstHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>mercyhurstHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>mercyhurstHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(mercyhurstHandlers.isFinalWithoutStory).map(event=>mercyhurstHandlers.attachArchiveStory(event)));if(sport==='Golf'&&mercyhurstHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(mercyhurstHandlers.isGolfAwaitingPlace).map(event=>mercyhurstHandlers.attachGolfPlace(event)));return events.filter(event=>!mercyhurstHandlers.isTennisWithoutStory(event)&&!mercyhurstHandlers.isGolfWithoutStory?.(event));}}
  ,{school:newHavenSchool,parseSchedule:(...args)=>newHavenHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>newHavenHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>newHavenHandlers.matchesRecap(...args),crossCountry:{matches:event=>newHavenHandlers.isCrossCountry(event),attach:event=>newHavenHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(newHavenHandlers.isFinalWithoutStory(event))await newHavenHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>newHavenHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>newHavenHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(newHavenHandlers.isFinalWithoutStory).map(event=>newHavenHandlers.attachArchiveStory(event)));if(sport==='Golf'&&newHavenHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(newHavenHandlers.isGolfAwaitingPlace).map(event=>newHavenHandlers.attachGolfPlace(event)));return events.filter(event=>!newHavenHandlers.isTennisWithoutStory(event)&&!newHavenHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stonehillSchool,parseSchedule:(...args)=>stonehillHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stonehillHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stonehillHandlers.matchesRecap(...args),crossCountry:{matches:event=>stonehillHandlers.isCrossCountry(event),attach:event=>stonehillHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(stonehillHandlers.isFinalWithoutStory(event))await stonehillHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>stonehillHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>stonehillHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(stonehillHandlers.isFinalWithoutStory).map(event=>stonehillHandlers.attachArchiveStory(event)));if(sport==='Golf'&&stonehillHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(stonehillHandlers.isGolfAwaitingPlace).map(event=>stonehillHandlers.attachGolfPlace(event)));return events.filter(event=>!stonehillHandlers.isTennisWithoutStory(event)&&!stonehillHandlers.isGolfWithoutStory?.(event));}}
  ,{school:wagnerSchool,parseSchedule:(...args)=>wagnerHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>wagnerHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>wagnerHandlers.matchesRecap(...args),crossCountry:{matches:event=>wagnerHandlers.isCrossCountry(event),attach:event=>wagnerHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(wagnerHandlers.isFinalWithoutStory(event))await wagnerHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>wagnerHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>wagnerHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(wagnerHandlers.isFinalWithoutStory).map(event=>wagnerHandlers.attachArchiveStory(event)));if(sport==='Golf'&&wagnerHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(wagnerHandlers.isGolfAwaitingPlace).map(event=>wagnerHandlers.attachGolfPlace(event)));return events.filter(event=>!wagnerHandlers.isTennisWithoutStory(event)&&!wagnerHandlers.isGolfWithoutStory?.(event));}}
  ,{school:easternIllinoisSchool,parseSchedule:(...args)=>easternIllinoisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>easternIllinoisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>easternIllinoisHandlers.matchesRecap(...args),crossCountry:{matches:event=>easternIllinoisHandlers.isCrossCountry(event),attach:event=>easternIllinoisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(easternIllinoisHandlers.isFinalWithoutStory(event))await easternIllinoisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>easternIllinoisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>easternIllinoisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(easternIllinoisHandlers.isFinalWithoutStory).map(event=>easternIllinoisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&easternIllinoisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(easternIllinoisHandlers.isGolfAwaitingPlace).map(event=>easternIllinoisHandlers.attachGolfPlace(event)));return events.filter(event=>!easternIllinoisHandlers.isTennisWithoutStory(event)&&!easternIllinoisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lindenwoodSchool,parseSchedule:(...args)=>lindenwoodHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lindenwoodHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lindenwoodHandlers.matchesRecap(...args),crossCountry:{matches:event=>lindenwoodHandlers.isCrossCountry(event),attach:event=>lindenwoodHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lindenwoodHandlers.isFinalWithoutStory(event))await lindenwoodHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lindenwoodHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lindenwoodHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lindenwoodHandlers.isFinalWithoutStory).map(event=>lindenwoodHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lindenwoodHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lindenwoodHandlers.isGolfAwaitingPlace).map(event=>lindenwoodHandlers.attachGolfPlace(event)));return events.filter(event=>!lindenwoodHandlers.isTennisWithoutStory(event)&&!lindenwoodHandlers.isGolfWithoutStory?.(event));}}
  ,{school:moreheadStateSchool,parseSchedule:(...args)=>moreheadStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>moreheadStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>moreheadStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>moreheadStateHandlers.isCrossCountry(event),attach:event=>moreheadStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(moreheadStateHandlers.isFinalWithoutStory(event))await moreheadStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>moreheadStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>moreheadStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(moreheadStateHandlers.isFinalWithoutStory).map(event=>moreheadStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&moreheadStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(moreheadStateHandlers.isGolfAwaitingPlace).map(event=>moreheadStateHandlers.attachGolfPlace(event)));return events.filter(event=>!moreheadStateHandlers.isTennisWithoutStory(event)&&!moreheadStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:siueSchool,parseSchedule:(...args)=>siueHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>siueHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>siueHandlers.matchesRecap(...args),crossCountry:{matches:event=>siueHandlers.isCrossCountry(event),attach:event=>siueHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(siueHandlers.isFinalWithoutStory(event))await siueHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>siueHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>siueHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(siueHandlers.isFinalWithoutStory).map(event=>siueHandlers.attachArchiveStory(event)));if(sport==='Golf'&&siueHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(siueHandlers.isGolfAwaitingPlace).map(event=>siueHandlers.attachGolfPlace(event)));return events.filter(event=>!siueHandlers.isTennisWithoutStory(event)&&!siueHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southeastMissouriSchool,parseSchedule:(...args)=>southeastMissouriHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southeastMissouriHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southeastMissouriHandlers.matchesRecap(...args),crossCountry:{matches:event=>southeastMissouriHandlers.isCrossCountry(event),attach:event=>southeastMissouriHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southeastMissouriHandlers.isFinalWithoutStory(event))await southeastMissouriHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southeastMissouriHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southeastMissouriHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southeastMissouriHandlers.isFinalWithoutStory).map(event=>southeastMissouriHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southeastMissouriHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southeastMissouriHandlers.isGolfAwaitingPlace).map(event=>southeastMissouriHandlers.attachGolfPlace(event)));return events.filter(event=>!southeastMissouriHandlers.isTennisWithoutStory(event)&&!southeastMissouriHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southernIndianaSchool,parseSchedule:(...args)=>southernIndianaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southernIndianaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southernIndianaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southernIndianaHandlers.isCrossCountry(event),attach:event=>southernIndianaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southernIndianaHandlers.isFinalWithoutStory(event))await southernIndianaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southernIndianaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southernIndianaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southernIndianaHandlers.isFinalWithoutStory).map(event=>southernIndianaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southernIndianaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southernIndianaHandlers.isGolfAwaitingPlace).map(event=>southernIndianaHandlers.attachGolfPlace(event)));return events.filter(event=>!southernIndianaHandlers.isTennisWithoutStory(event)&&!southernIndianaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:tennesseeStateSchool,parseSchedule:(...args)=>tennesseeStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>tennesseeStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>tennesseeStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>tennesseeStateHandlers.isCrossCountry(event),attach:event=>tennesseeStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(tennesseeStateHandlers.isFinalWithoutStory(event))await tennesseeStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>tennesseeStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>tennesseeStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(tennesseeStateHandlers.isFinalWithoutStory).map(event=>tennesseeStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&tennesseeStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(tennesseeStateHandlers.isGolfAwaitingPlace).map(event=>tennesseeStateHandlers.attachGolfPlace(event)));return events.filter(event=>!tennesseeStateHandlers.isTennisWithoutStory(event)&&!tennesseeStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utMartinSchool,parseSchedule:(...args)=>utMartinHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utMartinHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utMartinHandlers.matchesRecap(...args),crossCountry:{matches:event=>utMartinHandlers.isCrossCountry(event),attach:event=>utMartinHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utMartinHandlers.isFinalWithoutStory(event))await utMartinHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utMartinHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utMartinHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utMartinHandlers.isFinalWithoutStory).map(event=>utMartinHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utMartinHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utMartinHandlers.isGolfAwaitingPlace).map(event=>utMartinHandlers.attachGolfPlace(event)));return events.filter(event=>!utMartinHandlers.isTennisWithoutStory(event)&&!utMartinHandlers.isGolfWithoutStory?.(event));}}
  ,{school:westernIllinoisSchool,parseSchedule:(...args)=>westernIllinoisHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westernIllinoisHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westernIllinoisHandlers.matchesRecap(...args),crossCountry:{matches:event=>westernIllinoisHandlers.isCrossCountry(event),attach:event=>westernIllinoisHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westernIllinoisHandlers.isFinalWithoutStory(event))await westernIllinoisHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>westernIllinoisHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>westernIllinoisHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(westernIllinoisHandlers.isFinalWithoutStory).map(event=>westernIllinoisHandlers.attachArchiveStory(event)));if(sport==='Golf'&&westernIllinoisHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(westernIllinoisHandlers.isGolfAwaitingPlace).map(event=>westernIllinoisHandlers.attachGolfPlace(event)));return events.filter(event=>!westernIllinoisHandlers.isTennisWithoutStory(event)&&!westernIllinoisHandlers.isGolfWithoutStory?.(event));}}
  ,{school:americanSchool,parseSchedule:(...args)=>americanHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>americanHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>americanHandlers.matchesRecap(...args),crossCountry:{matches:event=>americanHandlers.isCrossCountry(event),attach:event=>americanHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(americanHandlers.isFinalWithoutStory(event))await americanHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>americanHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>americanHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(americanHandlers.isFinalWithoutStory).map(event=>americanHandlers.attachArchiveStory(event)));if(sport==='Golf'&&americanHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(americanHandlers.isGolfAwaitingPlace).map(event=>americanHandlers.attachGolfPlace(event)));return events.filter(event=>!americanHandlers.isTennisWithoutStory(event)&&!americanHandlers.isGolfWithoutStory?.(event));}}
  ,{school:armySchool,parseSchedule:(...args)=>armyHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>armyHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>armyHandlers.matchesRecap(...args),crossCountry:{matches:event=>armyHandlers.isCrossCountry(event),attach:event=>armyHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(armyHandlers.isFinalWithoutStory(event))await armyHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>armyHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>armyHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(armyHandlers.isFinalWithoutStory).map(event=>armyHandlers.attachArchiveStory(event)));if(sport==='Golf'&&armyHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(armyHandlers.isGolfAwaitingPlace).map(event=>armyHandlers.attachGolfPlace(event)));return events.filter(event=>!armyHandlers.isTennisWithoutStory(event)&&!armyHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bostonUniversitySchool,parseSchedule:(...args)=>bostonUniversityHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bostonUniversityHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bostonUniversityHandlers.matchesRecap(...args),crossCountry:{matches:event=>bostonUniversityHandlers.isCrossCountry(event),attach:event=>bostonUniversityHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bostonUniversityHandlers.isFinalWithoutStory(event))await bostonUniversityHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bostonUniversityHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bostonUniversityHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bostonUniversityHandlers.isFinalWithoutStory).map(event=>bostonUniversityHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bostonUniversityHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bostonUniversityHandlers.isGolfAwaitingPlace).map(event=>bostonUniversityHandlers.attachGolfPlace(event)));return events.filter(event=>!bostonUniversityHandlers.isTennisWithoutStory(event)&&!bostonUniversityHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bucknellSchool,parseSchedule:(...args)=>bucknellHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bucknellHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bucknellHandlers.matchesRecap(...args),crossCountry:{matches:event=>bucknellHandlers.isCrossCountry(event),attach:event=>bucknellHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bucknellHandlers.isFinalWithoutStory(event))await bucknellHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bucknellHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bucknellHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bucknellHandlers.isFinalWithoutStory).map(event=>bucknellHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bucknellHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bucknellHandlers.isGolfAwaitingPlace).map(event=>bucknellHandlers.attachGolfPlace(event)));return events.filter(event=>!bucknellHandlers.isTennisWithoutStory(event)&&!bucknellHandlers.isGolfWithoutStory?.(event));}}
  ,{school:holyCrossSchool,parseSchedule:(...args)=>holyCrossHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>holyCrossHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>holyCrossHandlers.matchesRecap(...args),crossCountry:{matches:event=>holyCrossHandlers.isCrossCountry(event),attach:event=>holyCrossHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(holyCrossHandlers.isFinalWithoutStory(event))await holyCrossHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>holyCrossHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>holyCrossHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(holyCrossHandlers.isFinalWithoutStory).map(event=>holyCrossHandlers.attachArchiveStory(event)));if(sport==='Golf'&&holyCrossHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(holyCrossHandlers.isGolfAwaitingPlace).map(event=>holyCrossHandlers.attachGolfPlace(event)));return events.filter(event=>!holyCrossHandlers.isTennisWithoutStory(event)&&!holyCrossHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lafayetteSchool,parseSchedule:(...args)=>lafayetteHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lafayetteHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lafayetteHandlers.matchesRecap(...args),crossCountry:{matches:event=>lafayetteHandlers.isCrossCountry(event),attach:event=>lafayetteHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lafayetteHandlers.isFinalWithoutStory(event))await lafayetteHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lafayetteHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lafayetteHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lafayetteHandlers.isFinalWithoutStory).map(event=>lafayetteHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lafayetteHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lafayetteHandlers.isGolfAwaitingPlace).map(event=>lafayetteHandlers.attachGolfPlace(event)));return events.filter(event=>!lafayetteHandlers.isTennisWithoutStory(event)&&!lafayetteHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lehighSchool,parseSchedule:(...args)=>lehighHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lehighHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lehighHandlers.matchesRecap(...args),crossCountry:{matches:event=>lehighHandlers.isCrossCountry(event),attach:event=>lehighHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lehighHandlers.isFinalWithoutStory(event))await lehighHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lehighHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lehighHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lehighHandlers.isFinalWithoutStory).map(event=>lehighHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lehighHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lehighHandlers.isGolfAwaitingPlace).map(event=>lehighHandlers.attachGolfPlace(event)));return events.filter(event=>!lehighHandlers.isTennisWithoutStory(event)&&!lehighHandlers.isGolfWithoutStory?.(event));}}
  ,{school:loyolaMarylandSchool,parseSchedule:(...args)=>loyolaMarylandHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>loyolaMarylandHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>loyolaMarylandHandlers.matchesRecap(...args),crossCountry:{matches:event=>loyolaMarylandHandlers.isCrossCountry(event),attach:event=>loyolaMarylandHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(loyolaMarylandHandlers.isFinalWithoutStory(event))await loyolaMarylandHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>loyolaMarylandHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>loyolaMarylandHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(loyolaMarylandHandlers.isFinalWithoutStory).map(event=>loyolaMarylandHandlers.attachArchiveStory(event)));if(sport==='Golf'&&loyolaMarylandHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(loyolaMarylandHandlers.isGolfAwaitingPlace).map(event=>loyolaMarylandHandlers.attachGolfPlace(event)));return events.filter(event=>!loyolaMarylandHandlers.isTennisWithoutStory(event)&&!loyolaMarylandHandlers.isGolfWithoutStory?.(event));}}
  ,{school:chattanoogaSchool,parseSchedule:(...args)=>chattanoogaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>chattanoogaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>chattanoogaHandlers.matchesRecap(...args),crossCountry:{matches:event=>chattanoogaHandlers.isCrossCountry(event),attach:event=>chattanoogaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(chattanoogaHandlers.isFinalWithoutStory(event))await chattanoogaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>chattanoogaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>chattanoogaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(chattanoogaHandlers.isFinalWithoutStory).map(event=>chattanoogaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&chattanoogaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(chattanoogaHandlers.isGolfAwaitingPlace).map(event=>chattanoogaHandlers.attachGolfPlace(event)));return events.filter(event=>!chattanoogaHandlers.isTennisWithoutStory(event)&&!chattanoogaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:citadelSchool,parseSchedule:(...args)=>citadelHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>citadelHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>citadelHandlers.matchesRecap(...args),crossCountry:{matches:event=>citadelHandlers.isCrossCountry(event),attach:event=>citadelHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(citadelHandlers.isFinalWithoutStory(event))await citadelHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>citadelHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>citadelHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(citadelHandlers.isFinalWithoutStory).map(event=>citadelHandlers.attachArchiveStory(event)));if(sport==='Golf'&&citadelHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(citadelHandlers.isGolfAwaitingPlace).map(event=>citadelHandlers.attachGolfPlace(event)));return events.filter(event=>!citadelHandlers.isTennisWithoutStory(event)&&!citadelHandlers.isGolfWithoutStory?.(event));}}
  ,{school:eastTennesseeStateSchool,parseSchedule:(...args)=>eastTennesseeStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>eastTennesseeStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>eastTennesseeStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>eastTennesseeStateHandlers.isCrossCountry(event),attach:event=>eastTennesseeStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(eastTennesseeStateHandlers.isFinalWithoutStory(event))await eastTennesseeStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>eastTennesseeStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>eastTennesseeStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(eastTennesseeStateHandlers.isFinalWithoutStory).map(event=>eastTennesseeStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&eastTennesseeStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(eastTennesseeStateHandlers.isGolfAwaitingPlace).map(event=>eastTennesseeStateHandlers.attachGolfPlace(event)));return events.filter(event=>!eastTennesseeStateHandlers.isTennisWithoutStory(event)&&!eastTennesseeStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:mercerSchool,parseSchedule:(...args)=>mercerHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mercerHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mercerHandlers.matchesRecap(...args),crossCountry:{matches:event=>mercerHandlers.isCrossCountry(event),attach:event=>mercerHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mercerHandlers.isFinalWithoutStory(event))await mercerHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>mercerHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>mercerHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(mercerHandlers.isFinalWithoutStory).map(event=>mercerHandlers.attachArchiveStory(event)));if(sport==='Golf'&&mercerHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(mercerHandlers.isGolfAwaitingPlace).map(event=>mercerHandlers.attachGolfPlace(event)));return events.filter(event=>!mercerHandlers.isTennisWithoutStory(event)&&!mercerHandlers.isGolfWithoutStory?.(event));}}
  ,{school:samfordSchool,parseSchedule:(...args)=>samfordHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>samfordHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>samfordHandlers.matchesRecap(...args),crossCountry:{matches:event=>samfordHandlers.isCrossCountry(event),attach:event=>samfordHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(samfordHandlers.isFinalWithoutStory(event))await samfordHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>samfordHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>samfordHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(samfordHandlers.isFinalWithoutStory).map(event=>samfordHandlers.attachArchiveStory(event)));if(sport==='Golf'&&samfordHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(samfordHandlers.isGolfAwaitingPlace).map(event=>samfordHandlers.attachGolfPlace(event)));return events.filter(event=>!samfordHandlers.isTennisWithoutStory(event)&&!samfordHandlers.isGolfWithoutStory?.(event));}}
  ,{school:uncGreensboroSchool,parseSchedule:(...args)=>uncGreensboroHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>uncGreensboroHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>uncGreensboroHandlers.matchesRecap(...args),crossCountry:{matches:event=>uncGreensboroHandlers.isCrossCountry(event),attach:event=>uncGreensboroHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(uncGreensboroHandlers.isFinalWithoutStory(event))await uncGreensboroHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>uncGreensboroHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>uncGreensboroHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(uncGreensboroHandlers.isFinalWithoutStory).map(event=>uncGreensboroHandlers.attachArchiveStory(event)));if(sport==='Golf'&&uncGreensboroHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(uncGreensboroHandlers.isGolfAwaitingPlace).map(event=>uncGreensboroHandlers.attachGolfPlace(event)));return events.filter(event=>!uncGreensboroHandlers.isTennisWithoutStory(event)&&!uncGreensboroHandlers.isGolfWithoutStory?.(event));}}
  ,{school:vmiSchool,parseSchedule:(...args)=>vmiHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>vmiHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>vmiHandlers.matchesRecap(...args),crossCountry:{matches:event=>vmiHandlers.isCrossCountry(event),attach:event=>vmiHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(vmiHandlers.isFinalWithoutStory(event))await vmiHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>vmiHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>vmiHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(vmiHandlers.isFinalWithoutStory).map(event=>vmiHandlers.attachArchiveStory(event)));if(sport==='Golf'&&vmiHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(vmiHandlers.isGolfAwaitingPlace).map(event=>vmiHandlers.attachGolfPlace(event)));return events.filter(event=>!vmiHandlers.isTennisWithoutStory(event)&&!vmiHandlers.isGolfWithoutStory?.(event));}}
  ,{school:westernCarolinaSchool,parseSchedule:(...args)=>westernCarolinaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>westernCarolinaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>westernCarolinaHandlers.matchesRecap(...args),crossCountry:{matches:event=>westernCarolinaHandlers.isCrossCountry(event),attach:event=>westernCarolinaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(westernCarolinaHandlers.isFinalWithoutStory(event))await westernCarolinaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>westernCarolinaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>westernCarolinaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(westernCarolinaHandlers.isFinalWithoutStory).map(event=>westernCarolinaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&westernCarolinaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(westernCarolinaHandlers.isGolfAwaitingPlace).map(event=>westernCarolinaHandlers.attachGolfPlace(event)));return events.filter(event=>!westernCarolinaHandlers.isTennisWithoutStory(event)&&!westernCarolinaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:eastTexasAmSchool,parseSchedule:(...args)=>eastTexasAmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>eastTexasAmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>eastTexasAmHandlers.matchesRecap(...args),crossCountry:{matches:event=>eastTexasAmHandlers.isCrossCountry(event),attach:event=>eastTexasAmHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(eastTexasAmHandlers.isFinalWithoutStory(event))await eastTexasAmHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>eastTexasAmHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>eastTexasAmHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(eastTexasAmHandlers.isFinalWithoutStory).map(event=>eastTexasAmHandlers.attachArchiveStory(event)));if(sport==='Golf'&&eastTexasAmHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(eastTexasAmHandlers.isGolfAwaitingPlace).map(event=>eastTexasAmHandlers.attachGolfPlace(event)));return events.filter(event=>!eastTexasAmHandlers.isTennisWithoutStory(event)&&!eastTexasAmHandlers.isGolfWithoutStory?.(event));}}
  ,{school:houstonChristianSchool,parseSchedule:(...args)=>houstonChristianHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>houstonChristianHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>houstonChristianHandlers.matchesRecap(...args),crossCountry:{matches:event=>houstonChristianHandlers.isCrossCountry(event),attach:event=>houstonChristianHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(houstonChristianHandlers.isFinalWithoutStory(event))await houstonChristianHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>houstonChristianHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>houstonChristianHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(houstonChristianHandlers.isFinalWithoutStory).map(event=>houstonChristianHandlers.attachArchiveStory(event)));if(sport==='Golf'&&houstonChristianHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(houstonChristianHandlers.isGolfAwaitingPlace).map(event=>houstonChristianHandlers.attachGolfPlace(event)));return events.filter(event=>!houstonChristianHandlers.isTennisWithoutStory(event)&&!houstonChristianHandlers.isGolfWithoutStory?.(event));}}
  ,{school:incarnateWordSchool,parseSchedule:(...args)=>incarnateWordHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>incarnateWordHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>incarnateWordHandlers.matchesRecap(...args),crossCountry:{matches:event=>incarnateWordHandlers.isCrossCountry(event),attach:event=>incarnateWordHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(incarnateWordHandlers.isFinalWithoutStory(event))await incarnateWordHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>incarnateWordHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>incarnateWordHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(incarnateWordHandlers.isFinalWithoutStory).map(event=>incarnateWordHandlers.attachArchiveStory(event)));if(sport==='Golf'&&incarnateWordHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(incarnateWordHandlers.isGolfAwaitingPlace).map(event=>incarnateWordHandlers.attachGolfPlace(event)));return events.filter(event=>!incarnateWordHandlers.isTennisWithoutStory(event)&&!incarnateWordHandlers.isGolfWithoutStory?.(event));}}
  ,{school:lamarSchool,parseSchedule:(...args)=>lamarHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>lamarHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>lamarHandlers.matchesRecap(...args),crossCountry:{matches:event=>lamarHandlers.isCrossCountry(event),attach:event=>lamarHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(lamarHandlers.isFinalWithoutStory(event))await lamarHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>lamarHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>lamarHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(lamarHandlers.isFinalWithoutStory).map(event=>lamarHandlers.attachArchiveStory(event)));if(sport==='Golf'&&lamarHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(lamarHandlers.isGolfAwaitingPlace).map(event=>lamarHandlers.attachGolfPlace(event)));return events.filter(event=>!lamarHandlers.isTennisWithoutStory(event)&&!lamarHandlers.isGolfWithoutStory?.(event));}}
  ,{school:mcneeseSchool,parseSchedule:(...args)=>mcneeseHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mcneeseHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mcneeseHandlers.matchesRecap(...args),crossCountry:{matches:event=>mcneeseHandlers.isCrossCountry(event),attach:event=>mcneeseHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mcneeseHandlers.isFinalWithoutStory(event))await mcneeseHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>mcneeseHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>mcneeseHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(mcneeseHandlers.isFinalWithoutStory).map(event=>mcneeseHandlers.attachArchiveStory(event)));if(sport==='Golf'&&mcneeseHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(mcneeseHandlers.isGolfAwaitingPlace).map(event=>mcneeseHandlers.attachGolfPlace(event)));return events.filter(event=>!mcneeseHandlers.isTennisWithoutStory(event)&&!mcneeseHandlers.isGolfWithoutStory?.(event));}}
  ,{school:newOrleansSchool,parseSchedule:(...args)=>newOrleansHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>newOrleansHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>newOrleansHandlers.matchesRecap(...args),crossCountry:{matches:event=>newOrleansHandlers.isCrossCountry(event),attach:event=>newOrleansHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(newOrleansHandlers.isFinalWithoutStory(event))await newOrleansHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>newOrleansHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>newOrleansHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(newOrleansHandlers.isFinalWithoutStory).map(event=>newOrleansHandlers.attachArchiveStory(event)));if(sport==='Golf'&&newOrleansHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(newOrleansHandlers.isGolfAwaitingPlace).map(event=>newOrleansHandlers.attachGolfPlace(event)));return events.filter(event=>!newOrleansHandlers.isTennisWithoutStory(event)&&!newOrleansHandlers.isGolfWithoutStory?.(event));}}
  ,{school:nichollsSchool,parseSchedule:(...args)=>nichollsHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>nichollsHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>nichollsHandlers.matchesRecap(...args),crossCountry:{matches:event=>nichollsHandlers.isCrossCountry(event),attach:event=>nichollsHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(nichollsHandlers.isFinalWithoutStory(event))await nichollsHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>nichollsHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>nichollsHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(nichollsHandlers.isFinalWithoutStory).map(event=>nichollsHandlers.attachArchiveStory(event)));if(sport==='Golf'&&nichollsHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(nichollsHandlers.isGolfAwaitingPlace).map(event=>nichollsHandlers.attachGolfPlace(event)));return events.filter(event=>!nichollsHandlers.isTennisWithoutStory(event)&&!nichollsHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northwesternStateSchool,parseSchedule:(...args)=>northwesternStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northwesternStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northwesternStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>northwesternStateHandlers.isCrossCountry(event),attach:event=>northwesternStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northwesternStateHandlers.isFinalWithoutStory(event))await northwesternStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northwesternStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northwesternStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northwesternStateHandlers.isFinalWithoutStory).map(event=>northwesternStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northwesternStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northwesternStateHandlers.isGolfAwaitingPlace).map(event=>northwesternStateHandlers.attachGolfPlace(event)));return events.filter(event=>!northwesternStateHandlers.isTennisWithoutStory(event)&&!northwesternStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southeasternLouisianaSchool,parseSchedule:(...args)=>southeasternLouisianaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southeasternLouisianaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southeasternLouisianaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southeasternLouisianaHandlers.isCrossCountry(event),attach:event=>southeasternLouisianaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southeasternLouisianaHandlers.isFinalWithoutStory(event))await southeasternLouisianaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southeasternLouisianaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southeasternLouisianaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southeasternLouisianaHandlers.isFinalWithoutStory).map(event=>southeasternLouisianaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southeasternLouisianaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southeasternLouisianaHandlers.isGolfAwaitingPlace).map(event=>southeasternLouisianaHandlers.attachGolfPlace(event)));return events.filter(event=>!southeasternLouisianaHandlers.isTennisWithoutStory(event)&&!southeasternLouisianaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stephenFAustinSchool,parseSchedule:(...args)=>stephenFAustinHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stephenFAustinHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stephenFAustinHandlers.matchesRecap(...args),crossCountry:{matches:event=>stephenFAustinHandlers.isCrossCountry(event),attach:event=>stephenFAustinHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(stephenFAustinHandlers.isFinalWithoutStory(event))await stephenFAustinHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>stephenFAustinHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>stephenFAustinHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(stephenFAustinHandlers.isFinalWithoutStory).map(event=>stephenFAustinHandlers.attachArchiveStory(event)));if(sport==='Golf'&&stephenFAustinHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(stephenFAustinHandlers.isGolfAwaitingPlace).map(event=>stephenFAustinHandlers.attachGolfPlace(event)));return events.filter(event=>!stephenFAustinHandlers.isTennisWithoutStory(event)&&!stephenFAustinHandlers.isGolfWithoutStory?.(event));}}
  ,{school:utrgvSchool,parseSchedule:(...args)=>utrgvHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>utrgvHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>utrgvHandlers.matchesRecap(...args),crossCountry:{matches:event=>utrgvHandlers.isCrossCountry(event),attach:event=>utrgvHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(utrgvHandlers.isFinalWithoutStory(event))await utrgvHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>utrgvHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>utrgvHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(utrgvHandlers.isFinalWithoutStory).map(event=>utrgvHandlers.attachArchiveStory(event)));if(sport==='Golf'&&utrgvHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(utrgvHandlers.isGolfAwaitingPlace).map(event=>utrgvHandlers.attachGolfPlace(event)));return events.filter(event=>!utrgvHandlers.isTennisWithoutStory(event)&&!utrgvHandlers.isGolfWithoutStory?.(event));}}
  ,{school:kansasCitySchool,parseSchedule:(...args)=>kansasCityHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>kansasCityHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>kansasCityHandlers.matchesRecap(...args),crossCountry:{matches:event=>kansasCityHandlers.isCrossCountry(event),attach:event=>kansasCityHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(kansasCityHandlers.isFinalWithoutStory(event))await kansasCityHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>kansasCityHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>kansasCityHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(kansasCityHandlers.isFinalWithoutStory).map(event=>kansasCityHandlers.attachArchiveStory(event)));if(sport==='Golf'&&kansasCityHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(kansasCityHandlers.isGolfAwaitingPlace).map(event=>kansasCityHandlers.attachGolfPlace(event)));return events.filter(event=>!kansasCityHandlers.isTennisWithoutStory(event)&&!kansasCityHandlers.isGolfWithoutStory?.(event));}}
  ,{school:northDakotaStateSchool,parseSchedule:(...args)=>northDakotaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>northDakotaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>northDakotaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>northDakotaStateHandlers.isCrossCountry(event),attach:event=>northDakotaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(northDakotaStateHandlers.isFinalWithoutStory(event))await northDakotaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>northDakotaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>northDakotaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(northDakotaStateHandlers.isFinalWithoutStory).map(event=>northDakotaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&northDakotaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(northDakotaStateHandlers.isGolfAwaitingPlace).map(event=>northDakotaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!northDakotaStateHandlers.isTennisWithoutStory(event)&&!northDakotaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:omahaSchool,parseSchedule:(...args)=>omahaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>omahaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>omahaHandlers.matchesRecap(...args),crossCountry:{matches:event=>omahaHandlers.isCrossCountry(event),attach:event=>omahaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(omahaHandlers.isFinalWithoutStory(event))await omahaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>omahaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>omahaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(omahaHandlers.isFinalWithoutStory).map(event=>omahaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&omahaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(omahaHandlers.isGolfAwaitingPlace).map(event=>omahaHandlers.attachGolfPlace(event)));return events.filter(event=>!omahaHandlers.isTennisWithoutStory(event)&&!omahaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southDakotaSchool,parseSchedule:(...args)=>southDakotaHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southDakotaHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southDakotaHandlers.matchesRecap(...args),crossCountry:{matches:event=>southDakotaHandlers.isCrossCountry(event),attach:event=>southDakotaHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southDakotaHandlers.isFinalWithoutStory(event))await southDakotaHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southDakotaHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southDakotaHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southDakotaHandlers.isFinalWithoutStory).map(event=>southDakotaHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southDakotaHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southDakotaHandlers.isGolfAwaitingPlace).map(event=>southDakotaHandlers.attachGolfPlace(event)));return events.filter(event=>!southDakotaHandlers.isTennisWithoutStory(event)&&!southDakotaHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southDakotaStateSchool,parseSchedule:(...args)=>southDakotaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southDakotaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southDakotaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>southDakotaStateHandlers.isCrossCountry(event),attach:event=>southDakotaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southDakotaStateHandlers.isFinalWithoutStory(event))await southDakotaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southDakotaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southDakotaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southDakotaStateHandlers.isFinalWithoutStory).map(event=>southDakotaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southDakotaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southDakotaStateHandlers.isGolfAwaitingPlace).map(event=>southDakotaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!southDakotaStateHandlers.isTennisWithoutStory(event)&&!southDakotaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:stThomasSchool,parseSchedule:(...args)=>stThomasHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>stThomasHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>stThomasHandlers.matchesRecap(...args),crossCountry:{matches:event=>stThomasHandlers.isCrossCountry(event),attach:event=>stThomasHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(stThomasHandlers.isFinalWithoutStory(event))await stThomasHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>stThomasHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>stThomasHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(stThomasHandlers.isFinalWithoutStory).map(event=>stThomasHandlers.attachArchiveStory(event)));if(sport==='Golf'&&stThomasHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(stThomasHandlers.isGolfAwaitingPlace).map(event=>stThomasHandlers.attachGolfPlace(event)));return events.filter(event=>!stThomasHandlers.isTennisWithoutStory(event)&&!stThomasHandlers.isGolfWithoutStory?.(event));}}
  ,{school:alabamaAmSchool,parseSchedule:(...args)=>alabamaAmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>alabamaAmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>alabamaAmHandlers.matchesRecap(...args),crossCountry:{matches:event=>alabamaAmHandlers.isCrossCountry(event),attach:event=>alabamaAmHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(alabamaAmHandlers.isFinalWithoutStory(event))await alabamaAmHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>alabamaAmHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>alabamaAmHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(alabamaAmHandlers.isFinalWithoutStory).map(event=>alabamaAmHandlers.attachArchiveStory(event)));if(sport==='Golf'&&alabamaAmHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(alabamaAmHandlers.isGolfAwaitingPlace).map(event=>alabamaAmHandlers.attachGolfPlace(event)));return events.filter(event=>!alabamaAmHandlers.isTennisWithoutStory(event)&&!alabamaAmHandlers.isGolfWithoutStory?.(event));}}
  ,{school:alabamaStateSchool,parseSchedule:(...args)=>alabamaStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>alabamaStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>alabamaStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>alabamaStateHandlers.isCrossCountry(event),attach:event=>alabamaStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(alabamaStateHandlers.isFinalWithoutStory(event))await alabamaStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>alabamaStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>alabamaStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(alabamaStateHandlers.isFinalWithoutStory).map(event=>alabamaStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&alabamaStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(alabamaStateHandlers.isGolfAwaitingPlace).map(event=>alabamaStateHandlers.attachGolfPlace(event)));return events.filter(event=>!alabamaStateHandlers.isTennisWithoutStory(event)&&!alabamaStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:alcornStateSchool,parseSchedule:(...args)=>alcornStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>alcornStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>alcornStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>alcornStateHandlers.isCrossCountry(event),attach:event=>alcornStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(alcornStateHandlers.isFinalWithoutStory(event))await alcornStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>alcornStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>alcornStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(alcornStateHandlers.isFinalWithoutStory).map(event=>alcornStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&alcornStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(alcornStateHandlers.isGolfAwaitingPlace).map(event=>alcornStateHandlers.attachGolfPlace(event)));return events.filter(event=>!alcornStateHandlers.isTennisWithoutStory(event)&&!alcornStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:bethuneCookmanSchool,parseSchedule:(...args)=>bethuneCookmanHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>bethuneCookmanHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>bethuneCookmanHandlers.matchesRecap(...args),crossCountry:{matches:event=>bethuneCookmanHandlers.isCrossCountry(event),attach:event=>bethuneCookmanHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(bethuneCookmanHandlers.isFinalWithoutStory(event))await bethuneCookmanHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>bethuneCookmanHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>bethuneCookmanHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(bethuneCookmanHandlers.isFinalWithoutStory).map(event=>bethuneCookmanHandlers.attachArchiveStory(event)));if(sport==='Golf'&&bethuneCookmanHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(bethuneCookmanHandlers.isGolfAwaitingPlace).map(event=>bethuneCookmanHandlers.attachGolfPlace(event)));return events.filter(event=>!bethuneCookmanHandlers.isTennisWithoutStory(event)&&!bethuneCookmanHandlers.isGolfWithoutStory?.(event));}}
  ,{school:floridaAmSchool,parseSchedule:(...args)=>floridaAmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>floridaAmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>floridaAmHandlers.matchesRecap(...args),crossCountry:{matches:event=>floridaAmHandlers.isCrossCountry(event),attach:event=>floridaAmHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(floridaAmHandlers.isFinalWithoutStory(event))await floridaAmHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>floridaAmHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>floridaAmHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(floridaAmHandlers.isFinalWithoutStory).map(event=>floridaAmHandlers.attachArchiveStory(event)));if(sport==='Golf'&&floridaAmHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(floridaAmHandlers.isGolfAwaitingPlace).map(event=>floridaAmHandlers.attachGolfPlace(event)));return events.filter(event=>!floridaAmHandlers.isTennisWithoutStory(event)&&!floridaAmHandlers.isGolfWithoutStory?.(event));}}
  ,{school:jacksonStateSchool,parseSchedule:(...args)=>jacksonStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>jacksonStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>jacksonStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>jacksonStateHandlers.isCrossCountry(event),attach:event=>jacksonStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(jacksonStateHandlers.isFinalWithoutStory(event))await jacksonStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>jacksonStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>jacksonStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(jacksonStateHandlers.isFinalWithoutStory).map(event=>jacksonStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&jacksonStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(jacksonStateHandlers.isGolfAwaitingPlace).map(event=>jacksonStateHandlers.attachGolfPlace(event)));return events.filter(event=>!jacksonStateHandlers.isTennisWithoutStory(event)&&!jacksonStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:mississippiValleyStateSchool,parseSchedule:(...args)=>mississippiValleyStateHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>mississippiValleyStateHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>mississippiValleyStateHandlers.matchesRecap(...args),crossCountry:{matches:event=>mississippiValleyStateHandlers.isCrossCountry(event),attach:event=>mississippiValleyStateHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(mississippiValleyStateHandlers.isFinalWithoutStory(event))await mississippiValleyStateHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>mississippiValleyStateHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>mississippiValleyStateHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(mississippiValleyStateHandlers.isFinalWithoutStory).map(event=>mississippiValleyStateHandlers.attachArchiveStory(event)));if(sport==='Golf'&&mississippiValleyStateHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(mississippiValleyStateHandlers.isGolfAwaitingPlace).map(event=>mississippiValleyStateHandlers.attachGolfPlace(event)));return events.filter(event=>!mississippiValleyStateHandlers.isTennisWithoutStory(event)&&!mississippiValleyStateHandlers.isGolfWithoutStory?.(event));}}
  ,{school:arkansasPineBluffSchool,parseSchedule:(...args)=>arkansasPineBluffHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>arkansasPineBluffHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>arkansasPineBluffHandlers.matchesRecap(...args),crossCountry:{matches:event=>arkansasPineBluffHandlers.isCrossCountry(event),attach:event=>arkansasPineBluffHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(arkansasPineBluffHandlers.isFinalWithoutStory(event))await arkansasPineBluffHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>arkansasPineBluffHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>arkansasPineBluffHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(arkansasPineBluffHandlers.isFinalWithoutStory).map(event=>arkansasPineBluffHandlers.attachArchiveStory(event)));if(sport==='Golf'&&arkansasPineBluffHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(arkansasPineBluffHandlers.isGolfAwaitingPlace).map(event=>arkansasPineBluffHandlers.attachGolfPlace(event)));return events.filter(event=>!arkansasPineBluffHandlers.isTennisWithoutStory(event)&&!arkansasPineBluffHandlers.isGolfWithoutStory?.(event));}}
  ,{school:prairieViewAmSchool,parseSchedule:(...args)=>prairieViewAmHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>prairieViewAmHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>prairieViewAmHandlers.matchesRecap(...args),crossCountry:{matches:event=>prairieViewAmHandlers.isCrossCountry(event),attach:event=>prairieViewAmHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(prairieViewAmHandlers.isFinalWithoutStory(event))await prairieViewAmHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>prairieViewAmHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>prairieViewAmHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(prairieViewAmHandlers.isFinalWithoutStory).map(event=>prairieViewAmHandlers.attachArchiveStory(event)));if(sport==='Golf'&&prairieViewAmHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(prairieViewAmHandlers.isGolfAwaitingPlace).map(event=>prairieViewAmHandlers.attachGolfPlace(event)));return events.filter(event=>!prairieViewAmHandlers.isTennisWithoutStory(event)&&!prairieViewAmHandlers.isGolfWithoutStory?.(event));}}
  ,{school:southernSchool,parseSchedule:(...args)=>southernHandlers.parseSchedule(...args),isEmptySchedule:(events,parsed)=>southernHandlers.isEmptySchedule(parsed),matchesRecap:(...args)=>southernHandlers.matchesRecap(...args),crossCountry:{matches:event=>southernHandlers.isCrossCountry(event),attach:event=>southernHandlers.attachMeetResults(event)},
    // Finals the schedule links no story for take theirs from the sport's
    // archive.
    beforeHighlights:async event=>{if(southernHandlers.isFinalWithoutStory(event))await southernHandlers.attachArchiveStory(event);},
    // A golf final whose card gives no place takes it from its final story
    // (kit createGolfStoryPlace, when the handlers spread it).
    results:[{matches:event=>southernHandlers.isGolfAwaitingPlace?.(event)??false,attach:event=>southernHandlers.attachGolfPlace(event)}],
    feed:async(events,sport)=>{await Promise.all(events.filter(southernHandlers.isFinalWithoutStory).map(event=>southernHandlers.attachArchiveStory(event)));if(sport==='Golf'&&southernHandlers.isGolfAwaitingPlace)await Promise.all(events.filter(southernHandlers.isGolfAwaitingPlace).map(event=>southernHandlers.attachGolfPlace(event)));return events.filter(event=>!southernHandlers.isTennisWithoutStory(event)&&!southernHandlers.isGolfWithoutStory?.(event));}}
];
const schoolModule=id=>SCHOOL_MODULES.find(entry=>entry.school.id===id)||null;
// One map of a school-data field across every module (keys are 'school|Sport').
const moduleEntries=field=>Object.assign({},...SCHOOL_MODULES.map(entry=>entry.school[field]||{}));
const moduleCrossCountry=event=>SCHOOL_MODULES.find(entry=>entry.crossCountry?.matches(event))?.crossCountry||null;

// Accounts verified through direct tags from an official school/team social
// account. These are explicit identity matches, not name-based guesses.
const VERIFIED_TEAM_TAG_INSTAGRAM=new Map(Object.entries({
  ...moduleEntries('verifiedInstagrams'),
}));

const SPORT_PATHS={
  'Football':['football'],'Volleyball':['womens-volleyball','wvball','volleyball'],
  "Women's Volleyball":['womens-volleyball','volleyball'],"Men's Volleyball":['mens-volleyball','volleyball'],
  'Soccer':['womens-soccer','wsoc','soccer','mens-soccer'],"Women's Soccer":['womens-soccer','soccer'],"Men's Soccer":['mens-soccer','soccer'],
  'Cross Country':['cross-country'],'Track & Field':['track-and-field','track-field'],
  'Basketball':['mens-basketball','womens-basketball','basketball'],"Men's Basketball":['mens-basketball','basketball'],"Women's Basketball":['womens-basketball','basketball'],
  'Baseball':['baseball'],'Softball':['softball'],'Wrestling':['wrestling'],
  'Swimming & Diving':['womens-swimming-and-diving','mens-swimming-and-diving','womens-swimming-diving','mens-swimming-diving','swimming-and-diving','swimming-diving','swimming'],'Tennis':['womens-tennis','mens-tennis','tennis'],
  'Golf':['womens-golf','mens-golf','golf'],'Rowing':['womens-rowing','rowing'],'Lacrosse':['womens-lacrosse','mens-lacrosse','lacrosse'],
  'Field Hockey':['field-hockey'],'Hockey':['mens-ice-hockey','womens-ice-hockey','ice-hockey','hockey'],
  'Gymnastics':['womens-gymnastics','mens-gymnastics','gymnastics'],'Beach Volleyball':['beach-volleyball'],
  'Water Polo':['womens-water-polo','mens-water-polo','water-polo'],'Fencing':['fencing'],'Bowling':['bowling'],
  'Equestrian':['equestrian'],'Rifle':['rifle'],'Skiing':['skiing'],'Triathlon':['triathlon'],
  'Acrobatics & Tumbling':['acrobatics-tumbling','acrobatics-and-tumbling'],'STUNT':['stunt']
};
const COMBINED_TEAM_SPORTS=new Set(['Basketball','Swimming & Diving']);
const KNOWN_ROSTER_URLS=new Map(Object.entries({
  ...moduleEntries('rosterUrls'),
}));
function schoolCombinedSports(school){
  return schoolModule(school?.id)?.school.combinedSports||COMBINED_TEAM_SPORTS;
}
function teamLabelForSource(school,sport,url){
  if(!schoolCombinedSports(school).has(sport))return null;
  const path=new URL(url).pathname;
  // A module names the team of a page whose address does not
  // (Iowa State's men's golf is /sports/golf/).
  // Notre Dame's teams share one API address: its whole address names the team.
  const labels=schoolModule(school.id)?.school.teamLabels,named=labels?.[url]||labels?.[path];if(named)return named;
  if(/\/(?:mens(?:-|\/)|men-|m-)/i.test(path))return"Men's";
  if(/\/(?:womens(?:-|\/)|women-|w-)/i.test(path))return"Women's";
  return null;
}
function labelTeamEvents(events,school,sport,url){
  const team_label=teamLabelForSource(school,sport,url);if(!team_label||events.some(event=>event.team_label))return events;
  return events.map(event=>({...event,team_label,title:`${team_label} · ${event.title}`}));
}

const KNOWN_URLS=new Map(Object.entries({
  ...moduleEntries('scheduleUrls'),
}));

const SEASONS={
  'Football':[[8,1]],'Volleyball':[[8,12]],"Men's Volleyball":[[1,5]],'Soccer':[[8,12]],
  'Cross Country':[[8,11]],'Field Hockey':[[8,11]],'Golf':[[8,11],[2,6]],'Tennis':[[9,11],[1,5]],
  'Swimming & Diving':[[9,3]],'Wrestling':[[10,3]],'Basketball':[[10,4]],'Hockey':[[10,4]],
  'Gymnastics':[[1,4]],'Track & Field':[[12,6]],'Baseball':[[2,6]],'Softball':[[2,6]],
  'Lacrosse':[[2,5]],'Rowing':[[3,6],[9,11]],'Beach Volleyball':[[2,5]],'Water Polo':[[1,5],[8,12]],
  'Fencing':[[10,3]],'Bowling':[[10,4]],'Equestrian':[[9,11],[2,4]],'Rifle':[[9,3]],
  'Skiing':[[1,3]],'Triathlon':[[8,11]],'Acrobatics & Tumbling':[[2,4]],'STUNT':[[2,5]],
  'Auto Racing':[[2,11]]
};

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>s==null?null:(String(s).replace(/\s+/g,' ').replace(/^[ ,\t\r\n]+|[ ,\t\r\n]+$/g,'')||null);
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// Official schedule times are stored as the school's local wall clock with a
// Z suffix. Compare days and convert provider UTC times in that same frame so
// an evening game is not moved to the next day or dropped at 00:00 UTC.
const STATE_TIME_ZONES={Arizona:'America/Phoenix',Utah:'America/Denver',Idaho:'America/Boise',Montana:'America/Denver',Colorado:'America/Denver',Nevada:'America/Los_Angeles',Hawaii:'Pacific/Honolulu','New Mexico':'America/Denver',Wyoming:'America/Denver','British Columbia':'America/Vancouver',California:'America/Los_Angeles',Oregon:'America/Los_Angeles',Washington:'America/Los_Angeles',Texas:'America/Chicago',Iowa:'America/Chicago',Kansas:'America/Chicago',Oklahoma:'America/Chicago',Illinois:'America/Chicago',Minnesota:'America/Chicago',Nebraska:'America/Chicago',Wisconsin:'America/Chicago',Alabama:'America/Chicago',Arkansas:'America/Chicago',Louisiana:'America/Chicago',Mississippi:'America/Chicago',Missouri:'America/Chicago',Tennessee:'America/Chicago','North Dakota':'America/Chicago','South Dakota':'America/Chicago'};
// Formula 1 races are listed in Eastern time, as ESPN and US broadcasts list them.
// Idaho's Moscow (the Vandals) keeps Pacific time; Boise, Mountain.
const SCHOOL_TIME_ZONES={chattanooga:'America/New_York','east-tennessee-state':'America/New_York',evansville:'America/Chicago',valparaiso:'America/Chicago','murray-state':'America/Chicago','western-kentucky':'America/Chicago',tennessee:'America/New_York',idaho:'America/Los_Angeles','formula-1':'America/New_York'};
// The catalog's menus (src/catalog.mjs): D1 in production, the bundled cards
// on a preview carrying catalog changes or when a read fails. The choice is
// made once a minute per isolate; production copies a changed catalog into
// D1 first. The page reads /catalog/menu and /catalog/entries.
const PRODUCTION_HOST='sas-sports.lovetogivepain.workers.dev';
let catalogBundle=null,catalogChoice=null;
async function bundledCatalog(){
  if(!catalogBundle){const cards=catalogCards(schools,sponsoredSports,schoolTimeZone,teamThemes),derived=catalogDerived(schools,matchText);catalogBundle={cards,records:schools,derived,store:bundledStore(cards),revision:await catalogRevision(cards,schools,derived)};}
  return catalogBundle;
}
async function catalogStore(env,url,now=Date.now()){
  const bundle=await bundledCatalog();
  if(!env?.CATALOG_DB)return{store:bundle.store,revision:bundle.revision};
  if(catalogChoice&&now-catalogChoice.at<60000)return catalogChoice.value;
  let store=bundle.store;
  try{
    if(url.hostname===PRODUCTION_HOST)await syncCatalog(env.CATALOG_DB,bundle.cards,bundle.revision,Date.now(),bundle.records,bundle.derived);
    if(await storeMatches(env.CATALOG_DB,bundle.revision,bundle.cards.length,bundle.records.length))store=d1Store(env.CATALOG_DB);
  }catch{}
  catalogChoice={at:now,value:{store,revision:bundle.revision}};
  return catalogChoice.value;
}
// The Worker's lookups by id (catalog step 2, docs/CATALOG.md): every one
// goes through catalogSchool(id), synchronous for the code that calls it. A
// request naming a school loads that entry from D1 first (loadCatalogEntries,
// kept per isolate for the revision); the bundled file answers the rest, so
// the bundled file can stop holding every entry once importers write D1.
const bundledById=new Map(schools.map(s=>[s.id,s]));
let loadedEntries={revision:null,byId:new Map(),members:new Map()};
function catalogSchool(id){return loadedEntries.byId.get(id)||bundledById.get(id)||null}
// A conference's members (conference records): loaded from D1 with the
// requested school, else the bundled list.
const bundledMembers=new Map();
function conferenceMembers(conference){
  const loaded=loadedEntries.members.get(conference);if(loaded)return loaded;
  if(!bundledMembers.has(conference))bundledMembers.set(conference,schools.filter(s=>s.conference===conference));
  return bundledMembers.get(conference);
}
// The request's catalog (the opponent lookup and the host allowlist read it
// deep in the build, where only the request's env and address are known).
let requestCatalog={env:null,url:null};
async function catalogD1(){
  const {env,url}=requestCatalog;if(!env?.CATALOG_DB||!url)return null;
  try{const {store}=await catalogStore(env,url);return store.kind==='d1'?env.CATALOG_DB:null}catch{return null}
}
async function loadCatalogEntries(env,url,ids){
  if(!env?.CATALOG_DB)return;
  try{
    const {store,revision}=await catalogStore(env,url);
    if(store.kind!=='d1')return;
    if(loadedEntries.revision!==revision)loadedEntries={revision,byId:new Map(),members:new Map()};
    const missing=ids.filter(id=>id&&!loadedEntries.byId.has(id));
    if(missing.length){
      const found=await catalogRecords(env.CATALOG_DB,missing);
      if(loadedEntries.revision===revision)for(const entry of found)loadedEntries.byId.set(entry.id,entry);
    }
    for(const conference of new Set(ids.map(id=>loadedEntries.byId.get(id)?.conference).filter(Boolean)))
      if(!loadedEntries.members.has(conference)){const members=await catalogMembers(env.CATALOG_DB,conference);if(loadedEntries.revision===revision)loadedEntries.members.set(conference,members);}
  }catch{}
}
// ?source=bundled answers from the bundled copy (to compare it with D1).
// An answer never changes within a revision, so each Cloudflare location
// keeps it for an hour, keyed by revision, store and request: D1 sits in
// eastern North America, and from Europe each menu step's D1 reads added
// 0.3-0.5 s (Oct 16). A failed D1 read (answered from the bundled copy) is
// not kept.
const CATALOG_EDGE_SECONDS=3600;
async function catalogAnswer(env,url,read){
  const chosen=await catalogStore(env,url),revision=chosen.revision;
  const store=url.searchParams.get('source')==='bundled'?(await bundledCatalog()).store:chosen.store;
  const edge=globalThis.caches?.default,key=new Request(`${url.origin}/__sas_cache/catalog?r=${revision}&s=${store.kind}&p=${encodeURIComponent(url.pathname+url.search)}`);
  if(edge){try{const hit=await edge.match(key);if(hit){const copy=new Response(hit.body,hit);copy.headers.set('cache-control','no-store');copy.headers.set('x-sas-cache','edge');return copy;}}catch{}}
  let body,source=store.kind;
  try{body=await read(store)}catch{const bundle=await bundledCatalog();body=await read(bundle.store);source='bundled';}
  const response=json(body);response.headers.set('x-sas-catalog',`${source} ${revision}`);
  if(edge&&source===store.kind){try{const kept=response.clone();kept.headers.set('cache-control',`public, max-age=${CATALOG_EDGE_SECONDS}`);await edge.put(key,kept)}catch{}}
  return response;
}
function schoolTimeZone(school){return SCHOOL_TIME_ZONES[school?.id]||STATE_TIME_ZONES[school?.state]||(school?.state?'America/New_York':'America/Chicago');}
function localWallClock(value,timeZone){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour)%24,Number(parts.minute),Number(parts.second)));}
function schoolNow(now,school){return localWallClock(now,schoolTimeZone(school));}
function schoolToday(now,school){const local=schoolNow(now,school);return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());}
// The school owns its policies and result handlers; shared utilities stay here.
const {applyVerifiedMeet:applyVerifiedKStateMeet,isKStateCrossCountry,parseKStateRecapTable,attachKStateRecapResults}=createKStateHandlers({clean,slug,ordinal,recapArticleText,recapMatchesEvent,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const kansasHandlers=createKansasHandlers({makeEvent,clean,sportMatches,recapMatchesEvent,recapArticleText,visibleText,ordinal,schoolNow});
const byuHandlers=createByuHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,recapArticleText,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucfHandlers=createUcfHandlers({makeEvent,visibleText,absoluteUrl,eventType,decodeHtml,ordinal,recapMatchesEvent,recapArticleText,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const coloradoHandlers=createColoradoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const cincinnatiHandlers=createCincinnatiHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const baylorHandlers=createBaylorHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const arizonaHandlers=createArizonaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const arizonaStateHandlers=createArizonaStateHandlers({makeEvent,visibleText,scheduleYearForDate,absoluteUrl,decodeHtml,ordinal,recapMatchesEvent,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utahHandlers=createUtahHandlers({slug,ordinal,recapMatchesEvent,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oklahomaStateHandlers=createOklahomaStateHandlers({ordinal,slug,recapMatchesEvent,fetchPdfText:url=>fetchOfficialPdfText(url),fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const houstonHandlers=createHoustonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const iowaStateHandlers=createIowaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tcuHandlers=createTcuHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const texasTechHandlers=createTexasTechHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westVirginiaHandlers=createWestVirginiaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const alabamaHandlers=createAlabamaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const floridaHandlers=createFloridaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const georgiaHandlers=createGeorgiaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lsuHandlers=createLsuHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oleMissHandlers=createOleMissHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mississippiStateHandlers=createMississippiStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tennesseeHandlers=createTennesseeHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const missouriHandlers=createMissouriHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const texasHandlers=createTexasHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const texasAmHandlers=createTexasAmHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const arkansasHandlers=createArkansasHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const auburnHandlers=createAuburnHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oklahomaHandlers=createOklahomaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const kentuckyHandlers=createKentuckyHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southCarolinaHandlers=createSouthCarolinaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const vanderbiltHandlers=createVanderbiltHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const illinoisHandlers=createIllinoisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const indianaHandlers=createIndianaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const iowaHandlers=createIowaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const marylandHandlers=createMarylandHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const michiganHandlers=createMichiganHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const michiganStateHandlers=createMichiganStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const nebraskaHandlers=createNebraskaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const minnesotaHandlers=createMinnesotaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northwesternHandlers=createNorthwesternHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ohioStateHandlers=createOhioStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oregonHandlers=createOregonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const pennStateHandlers=createPennStateHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const purdueHandlers=createPurdueHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const rutgersHandlers=createRutgersHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uclaHandlers=createUclaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uscHandlers=createUscHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const washingtonHandlers=createWashingtonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const wisconsinHandlers=createWisconsinHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const miamiHandlers=createMiamiHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const virginiaHandlers=createVirginiaHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bostonCollegeHandlers=createBostonCollegeHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const californiaHandlers=createCaliforniaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const clemsonHandlers=createClemsonHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const dukeHandlers=createDukeHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const floridaStateHandlers=createFloridaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const georgiaTechHandlers=createGeorgiaTechHandlers({makeEvent,visibleText,absoluteUrl,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const louisvilleHandlers=createLouisvilleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ncStateHandlers=createNcStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northCarolinaHandlers=createNorthCarolinaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const notreDameHandlers=createNotreDameHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const pittHandlers=createPittHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const smuHandlers=createSmuHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stanfordHandlers=createStanfordHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const syracuseHandlers=createSyracuseHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const wakeForestHandlers=createWakeForestHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const virginiaTechHandlers=createVirginiaTechHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const boiseStateHandlers=createBoiseStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const coloradoStateHandlers=createColoradoStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const fresnoStateHandlers=createFresnoStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const gonzagaHandlers=createGonzagaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oregonStateHandlers=createOregonStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sanDiegoStateHandlers=createSanDiegoStateHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const washingtonStateHandlers=createWashingtonStateHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const creightonHandlers=createCreightonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const depaulHandlers=createDepaulHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const marquetteHandlers=createMarquetteHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const providenceHandlers=createProvidenceHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const setonHallHandlers=createSetonHallHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stJohnsHandlers=createStJohnsHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uconnHandlers=createUconnHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const xavierHandlers=createXavierHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const montanaHandlers=createMontanaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const montanaStateHandlers=createMontanaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const idahoStateHandlers=createIdahoStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const easternWashingtonHandlers=createEasternWashingtonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northernArizonaHandlers=createNorthernArizonaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northernColoradoHandlers=createNorthernColoradoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const portlandStateHandlers=createPortlandStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const weberStateHandlers=createWeberStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southernUtahHandlers=createSouthernUtahHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utahTechHandlers=createUtahTechHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const arkansasStateHandlers=createArkansasStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const coastalCarolinaHandlers=createCoastalCarolinaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const georgiaSouthernHandlers=createGeorgiaSouthernHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const jamesMadisonHandlers=createJamesMadisonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const louisianaHandlers=createLouisianaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const louisianaTechHandlers=createLouisianaTechHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const marshallHandlers=createMarshallHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const oldDominionHandlers=createOldDominionHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southAlabamaHandlers=createSouthAlabamaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southernMissHandlers=createSouthernMissHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const troyHandlers=createTroyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ulmHandlers=createUlmHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const airForceHandlers=createAirForceHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const grandCanyonHandlers=createGrandCanyonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const newMexicoHandlers=createNewMexicoHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sanJoseStateHandlers=createSanJoseStateHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucDavisHandlers=createUcDavisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const unlvHandlers=createUnlvHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utepHandlers=createUtepHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const akronHandlers=createAkronHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ballStateHandlers=createBallStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bowlingGreenHandlers=createBowlingGreenHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const buffaloHandlers=createBuffaloHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const centralMichiganHandlers=createCentralMichiganHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const easternMichiganHandlers=createEasternMichiganHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const kentStateHandlers=createKentStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const miamiOhHandlers=createMiamiOhHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ohioHandlers=createOhioHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const toledoHandlers=createToledoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const umassHandlers=createUmassHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const calBaptistHandlers=createCalBaptistHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const calPolyHandlers=createCalPolyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const calStateFullertonHandlers=createCalStateFullertonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const csunHandlers=createCsunHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const longBeachStateHandlers=createLongBeachStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucIrvineHandlers=createUcIrvineHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucRiversideHandlers=createUcRiversideHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucSanDiegoHandlers=createUcSanDiegoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sacramentoStateHandlers=createSacramentoStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utahValleyHandlers=createUtahValleyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const csuBakersfieldHandlers=createCsuBakersfieldHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ucSantaBarbaraHandlers=createUcSantaBarbaraHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const charlotteHandlers=createCharlotteHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const eastCarolinaHandlers=createEastCarolinaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const fauHandlers=createFauHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const memphisHandlers=createMemphisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northTexasHandlers=createNorthTexasHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const riceHandlers=createRiceHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southFloridaHandlers=createSouthFloridaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const templeHandlers=createTempleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tulaneHandlers=createTulaneHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tulsaHandlers=createTulsaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uabHandlers=createUabHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utsaHandlers=createUtsaHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const delawareHandlers=createDelawareHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const fiuHandlers=createFiuHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const jacksonvilleStateHandlers=createJacksonvilleStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const libertyHandlers=createLibertyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const middleTennesseeHandlers=createMiddleTennesseeHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const missouriStateHandlers=createMissouriStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const samHoustonHandlers=createSamHoustonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westernKentuckyHandlers=createWesternKentuckyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lmuHandlers=createLmuHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const pacificHandlers=createPacificHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const pepperdineHandlers=createPepperdineHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const portlandHandlers=createPortlandHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const saintMarysHandlers=createSaintMarysHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sanFranciscoHandlers=createSanFranciscoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const santaClaraHandlers=createSantaClaraHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const seattleUHandlers=createSeattleUHandlers({makeEvent,recapMatchesEvent,decodeHtml,eventType,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const denverHandlers=createDenverHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const davidsonHandlers=createDavidsonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const duquesneHandlers=createDuquesneHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const fordhamHandlers=createFordhamHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const georgeMasonHandlers=createGeorgeMasonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const georgeWashingtonHandlers=createGeorgeWashingtonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const laSalleHandlers=createLaSalleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const rhodeIslandHandlers=createRhodeIslandHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const richmondHandlers=createRichmondHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const saintJosephsHandlers=createSaintJosephsHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const saintLouisHandlers=createSaintLouisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const evansvilleHandlers=createEvansvilleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const illinoisStateHandlers=createIllinoisStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const indianaStateHandlers=createIndianaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const murrayStateHandlers=createMurrayStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northernIowaHandlers=createNorthernIowaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southernIllinoisHandlers=createSouthernIllinoisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const valparaisoHandlers=createValparaisoHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const belmontHandlers=createBelmontHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const austinPeayHandlers=createAustinPeayHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bellarmineHandlers=createBellarmineHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const centralArkansasHandlers=createCentralArkansasHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const easternKentuckyHandlers=createEasternKentuckyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const jacksonvilleHandlers=createJacksonvilleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lipscombHandlers=createLipscombHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northAlabamaHandlers=createNorthAlabamaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northFloridaHandlers=createNorthFloridaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const queensHandlers=createQueensHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westGeorgiaHandlers=createWestGeorgiaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const abileneChristianHandlers=createAbileneChristianHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tarletonStateHandlers=createTarletonStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utArlingtonHandlers=createUtArlingtonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westFloridaHandlers=createWestFloridaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ualbanyHandlers=createUalbanyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const binghamtonHandlers=createBinghamtonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bryantHandlers=createBryantHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const maineHandlers=createMaineHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const newHampshireHandlers=createNewHampshireHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const njitHandlers=createNjitHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const umassLowellHandlers=createUmassLowellHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const umbcHandlers=createUmbcHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const charlestonSouthernHandlers=createCharlestonSouthernHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const gardnerWebbHandlers=createGardnerWebbHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const highPointHandlers=createHighPointHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const presbyterianHandlers=createPresbyterianHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const radfordHandlers=createRadfordHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uncAshevilleHandlers=createUncAshevilleHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uscUpstateHandlers=createUscUpstateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const winthropHandlers=createWinthropHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const campbellHandlers=createCampbellHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const charlestonHandlers=createCharlestonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const drexelHandlers=createDrexelHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const elonHandlers=createElonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const hamptonHandlers=createHamptonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const hofstraHandlers=createHofstraHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const monmouthHandlers=createMonmouthHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ncAtHandlers=createNcAtHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stonyBrookHandlers=createStonyBrookHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const towsonHandlers=createTowsonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const williamMaryHandlers=createWilliamMaryHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const clevelandStateHandlers=createClevelandStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const detroitMercyHandlers=createDetroitMercyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const greenBayHandlers=createGreenBayHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const iuIndyHandlers=createIuIndyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const milwaukeeHandlers=createMilwaukeeHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const purdueFortWayneHandlers=createPurdueFortWayneHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const robertMorrisHandlers=createRobertMorrisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const wrightStateHandlers=createWrightStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const youngstownStateHandlers=createYoungstownStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northernIllinoisHandlers=createNorthernIllinoisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const brownHandlers=createBrownHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const columbiaHandlers=createColumbiaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const cornellHandlers=createCornellHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const dartmouthHandlers=createDartmouthHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const pennHandlers=createPennHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const princetonHandlers=createPrincetonHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const fairfieldHandlers=createFairfieldHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const manhattanHandlers=createManhattanHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const maristHandlers=createMaristHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const merrimackHandlers=createMerrimackHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mountStMarysHandlers=createMountStMarysHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const niagaraHandlers=createNiagaraHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const quinnipiacHandlers=createQuinnipiacHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const riderHandlers=createRiderHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sacredHeartHandlers=createSacredHeartHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const sienaHandlers=createSienaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const coppinStateHandlers=createCoppinStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const delawareStateHandlers=createDelawareStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const marylandEasternShoreHandlers=createMarylandEasternShoreHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const morganStateHandlers=createMorganStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const norfolkStateHandlers=createNorfolkStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const ncCentralHandlers=createNcCentralHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southCarolinaStateHandlers=createSouthCarolinaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const chicagoStateHandlers=createChicagoStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const leMoyneHandlers=createLeMoyneHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const liuHandlers=createLiuHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mercyhurstHandlers=createMercyhurstHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const newHavenHandlers=createNewHavenHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stonehillHandlers=createStonehillHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const wagnerHandlers=createWagnerHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const easternIllinoisHandlers=createEasternIllinoisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lindenwoodHandlers=createLindenwoodHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const moreheadStateHandlers=createMoreheadStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const siueHandlers=createSiueHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southeastMissouriHandlers=createSoutheastMissouriHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southernIndianaHandlers=createSouthernIndianaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const tennesseeStateHandlers=createTennesseeStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utMartinHandlers=createUtMartinHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westernIllinoisHandlers=createWesternIllinoisHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const americanHandlers=createAmericanHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const armyHandlers=createArmyHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bostonUniversityHandlers=createBostonUniversityHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bucknellHandlers=createBucknellHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const holyCrossHandlers=createHolyCrossHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lafayetteHandlers=createLafayetteHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lehighHandlers=createLehighHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const loyolaMarylandHandlers=createLoyolaMarylandHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const chattanoogaHandlers=createChattanoogaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const citadelHandlers=createCitadelHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const eastTennesseeStateHandlers=createEastTennesseeStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mercerHandlers=createMercerHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const samfordHandlers=createSamfordHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const uncGreensboroHandlers=createUncGreensboroHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const vmiHandlers=createVmiHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const westernCarolinaHandlers=createWesternCarolinaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const eastTexasAmHandlers=createEastTexasAmHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const houstonChristianHandlers=createHoustonChristianHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const incarnateWordHandlers=createIncarnateWordHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const lamarHandlers=createLamarHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mcneeseHandlers=createMcneeseHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const newOrleansHandlers=createNewOrleansHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const nichollsHandlers=createNichollsHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northwesternStateHandlers=createNorthwesternStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southeasternLouisianaHandlers=createSoutheasternLouisianaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stephenFAustinHandlers=createStephenFAustinHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const utrgvHandlers=createUtrgvHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const kansasCityHandlers=createKansasCityHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const northDakotaStateHandlers=createNorthDakotaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const omahaHandlers=createOmahaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southDakotaHandlers=createSouthDakotaHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southDakotaStateHandlers=createSouthDakotaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const stThomasHandlers=createStThomasHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const alabamaAmHandlers=createAlabamaAmHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const alabamaStateHandlers=createAlabamaStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const alcornStateHandlers=createAlcornStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const bethuneCookmanHandlers=createBethuneCookmanHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const floridaAmHandlers=createFloridaAmHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const jacksonStateHandlers=createJacksonStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const mississippiValleyStateHandlers=createMississippiValleyStateHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const arkansasPineBluffHandlers=createArkansasPineBluffHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const prairieViewAmHandlers=createPrairieViewAmHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
const southernHandlers=createSouthernHandlers({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});
function decodeHtml(s){if(s==null)return'';return String(s).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  // Accented letters by name (calbears.com, Oct 14: "Ko&ccaron;anas").
  .replace(/&([A-Za-z])(acute|grave|circ|uml|tilde|caron|cedil|ring);/g,(_,letter,mark)=>(letter+{acute:'\u0301',grave:'\u0300',circ:'\u0302',uml:'\u0308',tilde:'\u0303',caron:'\u030C',cedil:'\u0327',ring:'\u030A'}[mark]).normalize('NFC'));}
function visibleText(raw){if(raw==null)return'';return clean(decodeHtml(raw).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '))||'';}
function sportMatches(a,b){const n=s=>String(s).toLowerCase().replace(/\b(men's|women's|mens|womens)\b/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();a=n(a);b=n(b);return a===b||a.includes(b)||b.includes(a);}
function rosterUrls(school,sport){
  const known=KNOWN_ROSTER_URLS.get(`${school.id}|${sport}`);if(known)return Array.isArray(known)?known:[known];
  const base=school.athletics_url.replace(/\/$/,'');
  return[...new Set((SPORT_PATHS[sport]||[slug(sport)]).map(p=>`${base}/sports/${p}/roster`))];
}
function dailyRank(value){
  const day=new Date().toISOString().slice(0,10);let h=2166136261;
  for(const ch of `${day}|${value}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
function rosterPayloadImages(raw,base){
  // WMT sends roster portraits inside its embedded application payload while
  // the server-rendered <img> contains only a transparent lazy-load placeholder.
  const text=String(raw||'').replace(/\\u002F/gi,'/').replace(/\\u0026/gi,'&').replace(/\\\//g,'/');
  const images=new Map();let m;
  const re=/"([^"]+\.(?:jpe?g|png|webp|avif))",(?:"[^"]*",)?"(https?:\/\/[^"]+\.(?:jpe?g|png|webp|avif)(?:\?[^"]*)?)"/gi;
  while((m=re.exec(text))){
    const key=slug(decodeHtml(m[1]).replace(/\.[^.]+$/,''));
    const url=absoluteUrl(m[2],base);
    if(key&&url&&!/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(url)))images.set(key,url);
  }
  return images;
}
function decodeURIComponentSafe(value){try{return decodeURIComponent(value)}catch{return String(value||'')}}
function officialCardInstagram(value){
  // Some WMT publishers accidentally prepend instagram.com twice. Because
  // this link is inside the named athlete's official roster card, recover the
  // final handle while still rejecting navigation/team destinations.
  // The handle must end the path: "merritt%20_zieminick" (Vanderbilt) is a
  // broken link, and its prefix "merritt" is someone else's account.
  // A link written inside another without its scheme
  // ("instagram.com/www.instagram.com/chloe._.hooker/", Notre Dame) is the inner one.
  const text=decodeHtml(value||'').replace(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?=(?:https?:\/\/)?(?:www\.)?instagram\.com\/)/gi,'');
  const matches=[...text.matchAll(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([A-Za-z0-9._]+)(?=$|[/?#"'\s])/gi)];
  const handle=matches.at(-1)?.[1]?.replace(/^@/,'').toLowerCase();
  return handle&&!BLOCKED_INSTAGRAM_HANDLES.has(handle)?`https://www.instagram.com/${handle}/`:null;
}
function rosterProfiles(raw,base){
  const byUrl=new Map(),payloadImages=rosterPayloadImages(raw,base),socials=rosterSocialInstagrams(raw);let m;
  // Capture the complete roster href first. Validating inside this expression
  // allowed a staff URL like /roster/season/2026/staff/name to be truncated to
  // /roster/season/2026 and incorrectly accepted as an athlete profile.
  const re=/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  const nameScore=name=>{
    if(!name||name.length>80||/^(?:jersey\s+number\s+)?\d+$/i.test(name))return-1;
    let score=/^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+)+$/.test(name)?10:0;
    if(/jersey|number|image|photo/i.test(name))score-=10;
    return score;
  };
  // WMT/Nuxt keeps each athlete's name, profile, portrait, and Instagram link
  // inside one roster card but does not publish SIDEARM's social aria-label.
  // Bind fields inside the card so navigation/team accounts remain ineligible.
  const wmtCards=String(raw||'').split(/<div\b[^>]*class=["'][^"']*\broster-card(?:-item)?(?=\s|["'])[^"']*["'][^>]*>/i).slice(1);
  // South Carolina's roster-card is the whole list (schema.org athlete items,
  // read below): a "card" that links several players is no athlete's card.
  const playerLinks=body=>new Set([...body.matchAll(/href=["']([^"']*\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#/]+)/gi)].map(x=>x[1].replace(/^https?:\/\/[^/]+/,''))).size;
  for(const body of wmtCards){
    if(playerLinks(body)>1)continue;
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),path=url?new URL(url).pathname:'';
    if(!url||/\/(?:staff|coaches)\//i.test(path))continue;
    const imgAlt=decodeHtml((body.match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||'');
    // A link around the portrait only has no text: its alt names the
    // athlete ("Hannah Whittingstall Headshot", Iowa; "Matthew Hull headshot
    // photo", UCLA).
    // The portrait's link comes first and has no text; the card's title link
    // names the athlete (Virginia's portraits are alt "Women's Soccer").
    const titled=[...body.matchAll(/<a\b[^>]*href=["'][^"']*\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(x=>clean(visibleText(x[1]))).find(text=>nameScore(text)>0);
    // A card whose link wraps the whole card ("Chris Bacchioni 149 lbs
    // Senior", Virginia Tech wrestling) names the athlete in its title.
    const heading=clean(visibleText((body.match(/<h[1-6]\b[^>]*class=["'][^"']*\broster-card-item__title\b[^"']*["'][^>]*>([\s\S]*?)<\/h[1-6]>/i)||[])[1]||''));
    const name=nameScore(heading)>0?heading:clean((visibleText(profileMatch[2])||titled||imgAlt).replace(/(?:\s+(?:headshot|photo|head shot))+\.?$/i,''));if(nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const imgTitle=decodeHtml((body.match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||'');
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(body,base,name,true)||null;
    byUrl.set(url,{name,url,image_url,instagram_url});
  }
  // Large WMT rosters, including Cincinnati Football, render compact list
  // items instead of cards. The player name, portrait and social link remain
  // identity-bound inside one official roster row.
  const wmtListItems=String(raw||'').split(/<li\b[^>]*class=["'][^"']*\broster-list-item(?=\s|["'])[^"']*["'][^>]*>/i).slice(1);
  for(const body of wmtListItems){
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),path=url?new URL(url).pathname:'';
    if(!url||/(?:staff|coaches)\//i.test(path))continue;
    const imgAlt=decodeHtml((body.match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||'');
    // A link around the portrait only has no text: its alt names the
    // athlete ("Hannah Whittingstall Headshot", Iowa; "Matthew Hull headshot
    // photo", UCLA).
    // The portrait's link comes first and has no text; the card's title link
    // names the athlete (Virginia's portraits are alt "Women's Soccer").
    const titled=[...body.matchAll(/<a\b[^>]*href=["'][^"']*\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(x=>clean(visibleText(x[1]))).find(text=>nameScore(text)>0);
    const name=clean((visibleText(profileMatch[2])||titled||imgAlt).replace(/(?:\s+(?:headshot|photo|head shot))+\.?$/i,''));if(nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const imgTitle=decodeHtml((body.match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||'');
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(body,base,name,true)||null;
    byUrl.set(url,{name,url,image_url,instagram_url});
  }
  // South Carolina's WordPress roster: one schema.org athlete list item per
  // player (<li itemprop="athlete">), its Instagram in the item's own socials.
  const personItems=String(raw||'').split(/<li\b[^>]*itemprop=["']athlete["'][^>]*>/i).slice(1).map(item=>item.split(/<\/ul>\s*<\/div>\s*<\/li>/i)[0]);
  for(const body of personItems){
    if(playerLinks(body)!==1)continue;
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)?.map(tag=>tag.match(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)).find(x=>visibleText(x[2]));
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base);
    const name=clean(visibleText(profileMatch[2]));if(!url||nameScore(name)<=0)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const image_url=athleteImage(body,base,name,true)||byUrl.get(url)?.image_url||null;
    byUrl.set(url,{name,url,image_url,instagram_url:officialCardInstagram(instagram)});
  }
  // Other WMT sports use table rows instead of cards. Apply the same
  // same-container identity rule to those rows.
  const wmtRows=String(raw||'').split(/<tr\b[^>]*>/i).slice(1);
  for(const row of wmtRows){
    const body=row.split(/<\/tr\s*>/i)[0];
    // Arkansas's (WordPress) roster rows link /roster/<name>/ on the site's
    // own host, with the athlete's Instagram in the same row.
    const profileMatch=body.match(/<a\b[^>]*href=["']([^"']*\/sports\/[^"']+\/roster\/(?:season\/[^/"'?#]+\/)?player\/[^"'?#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
      ||body.match(/<a\b[^>]*href=["']((?:https?:\/\/[^/"']+)?\/roster\/[a-z0-9-]+\/?)["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!profileMatch)continue;
    const url=absoluteUrl(profileMatch[1],base),name=clean(visibleText(profileMatch[2]));
    if(!url||nameScore(name)<=0)continue;
    if(!/\/sports\//.test(profileMatch[1])&&new URL(url).hostname!==new URL(base).hostname)continue;
    const instagram=(body.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#\s]+)[^"']*["']/i)||[])[1];
    const instagram_url=officialCardInstagram(instagram);
    const previous=byUrl.get(url);
    byUrl.set(url,{name,url,image_url:previous?.image_url||null,instagram_url:instagram_url||previous?.instagram_url||null});
  }
  while((m=re.exec(raw))){
    const url=absoluteUrl(m[1],base),imgAlt=decodeHtml((m[2].match(/<img\b[^>]*alt=["']([^"']*)/i)||[])[1]||''),imgTitle=decodeHtml((m[2].match(/<img\b[^>]*title=["']([^"']*)/i)||[])[1]||''),name=clean((visibleText(m[2])||imgAlt).replace(/(?:\s+(?:headshot|photo|head shot))+\.?$/i,''));if(!url)continue;
    const path=new URL(url).pathname;
    // Only real player profile shapes are eligible. This rejects seasonal
    // roster pages and staff/coach profiles even when their URLs are nested.
    if(/\/(?:staff|coaches)\//i.test(path))continue;
    // A season's roster page (/roster/season/2026, "Roster for Baseball" on
    // Texas A&M's pages) has the /roster/<name>/<id> shape but is no athlete.
    if(/\/roster\/season\/\d{4}\/?$/i.test(path))continue;
    if(!/\/roster\/(?:player\/[^/]+|season\/[^/]+\/player\/[^/]+|[^/]+\/\d+)\/?$/i.test(path))continue;
    const previous=byUrl.get(url);
    const image_url=payloadImages.get(slug(name))||payloadImages.get(slug(imgTitle.replace(/\.[^.]+$/,'')))||athleteImage(m[2],base,name,true)||previous?.image_url||null;
    // SIDEARM often publishes the portrait and the visible athlete name in two
    // separate anchors that share the same profile URL. Keep an image-only
    // anchor long enough to join it to the later name anchor.
    if(!previous&&image_url)byUrl.set(url,{name:'',url,image_url});
    else if(nameScore(name)>nameScore(previous?.name))byUrl.set(url,{name,url,image_url});
    else if(previous&&!previous.image_url&&image_url)byUrl.set(url,{...previous,image_url});
  }
  // A SIDEARM roster rendered in the browser (George Mason, Oct 22) carries
  // its players as page data, "players":[{rp_id,first_name,last_name,image,
  // socials:{Instagram:{handle}}}], and no athlete links: each player's
  // official profile is <roster>/<first-last>/<rp_id>.
  for(const player of rosterPagePlayers(raw)){
    const name=`${player.first_name||''} ${player.last_name||''}`.replace(/\s+/g,' ').trim();
    if(!name||!player.rp_id||player.rp_hide)continue;
    const url=absoluteUrl(`${String(base||'').replace(/[?#].*$/,'').replace(/\/$/,'')}/${slug(name)}/${player.rp_id}`,base);
    if(!url||byUrl.has(url))continue;
    const handle=player.socials?.Instagram?.handle||player.instagram_username||'';
    byUrl.set(url,{name,url,image_url:player.image?.fullpath?absoluteUrl(player.image.fullpath,base):null,instagram_url:handle?officialCardInstagram(`https://www.instagram.com/${String(handle).replace(/^@/,'')}`):null});
  }
  return[...byUrl.values()].filter(x=>nameScore(x.name)>0).map(profile=>({...profile,instagram_url:profile.instagram_url||socials.get(profile.name.toLowerCase())||null}));
}
// The page data's "players" list on a browser-rendered SIDEARM roster.
function rosterPagePlayers(raw){
  const text=String(raw||''),at=text.indexOf('"players":[');
  if(at<0||!/"rp_id":/.test(text.slice(at,at+400)))return[];
  let depth=0,inString=false,escaped=false,start=at+'"players":'.length;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
    if(c==='"')inString=true;else if(c==='[')depth++;else if(c===']'&&!--depth){try{const list=JSON.parse(text.slice(start,i+1));return Array.isArray(list)?list.filter(x=>x&&typeof x==='object'):[];}catch{return[];}}
  }
  return[];
}
function athleteImage(raw,base,name,trustedContainer=false){
  const candidates=[];
  const add=(value,score=0)=>{
    const url=absoluteUrl(value,base);if(!url)return;
    if(!/^https?:/i.test(url))return;
    const decoded=decodeHtml(url);
    if(/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|sport[_-]?mark)/i.test(decoded)||/\.svg(?:$|\?)/i.test(decoded))return;
    candidates.push({url,score});
  };
  // Prefer Schema.org Person data because it binds the full athlete name and
  // portrait URL in the same official record, independent of visual layout.
  const wantedName=matchText(name);let schemaMatch;
  const schemas=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const visitSchema=value=>{
    if(!value||typeof value!=='object')return null;
    if(String(value['@type']||'').toLowerCase()==='person'&&matchText(value.name)===wantedName){
      const image=typeof value.image==='string'?value.image:value.image?.url;
      if(image)return absoluteUrl(image,base);
    }
    for(const child of Array.isArray(value)?value:Object.values(value)){const found=visitSchema(child);if(found)return found}
    return null;
  };
  while((schemaMatch=schemas.exec(raw))){
    try{const schemaImage=visitSchema(JSON.parse(decodeHtml(schemaMatch[1])));if(schemaImage)add(schemaImage,50)}catch{}
  }
  const identityMatch=(url='',alt='')=>{
    const tokens=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>x.length>1);
    const haystack=`${decodeHtml(url)} ${decodeHtml(alt)}`.toLowerCase().replace(/[^a-z0-9]+/g,' ');
    return tokens.length>=2&&tokens.every(token=>haystack.includes(token));
  };
  let m;
  // Next-generation SIDEARM profile pages explicitly mark the athlete's own
  // biography portrait. Prefer it over the surrounding roster thumbnail rail.
  const bioPortrait=raw.match(/c-rosterbio__player__image[^>]*>[\s\S]{0,1200}?<img\b([^>]*)>/i);
  if(bioPortrait){
    const attrs=bioPortrait[1],rawSrc=(attrs.match(/(?:src|data-src|srcset|data-srcset)=["']([^"']+)/i)||[])[1];
    const src=rawSrc?.split(',')[0]?.trim()?.split(/\s+/)[0];
    add(src,30);
  }
  const meta=/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi;
  while((m=meta.exec(raw))){const src=m[1]||m[2];if(identityMatch(src))add(src,1)}
  const wanted=String(name||'').toLowerCase().split(/\s+/).filter(Boolean);
  const imgs=/<img\b([^>]*)>/gi;
  while((m=imgs.exec(raw))){
    const attrs=m[1],rawSrc=(attrs.match(/(?:src|data-src|srcset|data-srcset)=["']([^"']+)/i)||[])[1];
    const src=rawSrc?.split(',')[0]?.trim()?.split(/\s+/)[0],alt=decodeHtml((attrs.match(/alt=["']([^"']*)/i)||[])[1]||'').toLowerCase();
    if(!trustedContainer&&!identityMatch(src,alt))continue;
    let score=trustedContainer?10:/(?:headshot|roster|player|athlete|bio)/i.test(attrs)?5:0;
    if(wanted.length&&wanted.every(part=>alt.includes(part)))score+=10;
    add(src,score);
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]?.url||null;
}
function officialProfileImage(raw,profileUrl){
  const match=String(raw||'').match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  const imageUrl=absoluteUrl(match?.[1]||match?.[2],profileUrl);if(!imageUrl)return null;
  try{
    const imageHost=new URL(imageUrl).hostname.replace(/^www\./,''),profileHost=new URL(profileUrl).hostname.replace(/^www\./,'');
    return imageHost===profileHost&&!/(?:logo|placeholder|default|favicon|icon|brand)/i.test(decodeURIComponentSafe(imageUrl))?imageUrl:null;
  }catch{return null}
}
const BLOCKED_INSTAGRAM_HANDLES=new Set([...kstateSchool.blockedInstagramHandles,...arkansasSchool.blockedInstagramHandles,...southCarolinaSchool.blockedInstagramHandles,'sundevilathletics','texastech_fb','texastech','ttumensgolf','texastechwgolf','explore','accounts','p','reel','reels',
  // Instagram's embed script ("instagram.com/embed.js" on Cal Baptist's
  // profile pages, Oct 22) is no handle.
  'embed.js','embed']);
function verifiedInstagram(raw){
  // Some official athlete bios publish personal social links only inside a
  // Schema.org Person record. Accept those identity-bound links before scanning
  // page navigation, which commonly contains the school or team account.
  let schemaMatch;const schemas=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const personInstagram=value=>{
    if(!value||typeof value!=='object')return null;
    if(String(value['@type']||'').toLowerCase()==='person'){
      for(const link of Array.isArray(value.sameAs)?value.sameAs:[value.sameAs]){
        if(typeof link!=='string')continue;
        try{const u=new URL(link),parts=u.pathname.split('/').filter(Boolean),handle=(parts[0]||'').replace(/^@/,'').toLowerCase();if(/(?:^|\.)instagram\.com$/i.test(u.hostname)&&parts.length===1&&handle&&!BLOCKED_INSTAGRAM_HANDLES.has(handle))return `https://www.instagram.com/${handle}/`}catch{}
      }
    }
    for(const child of Array.isArray(value)?value:Object.values(value)){const found=personInstagram(child);if(found)return found}
    return null;
  };
  while((schemaMatch=schemas.exec(raw))){try{const found=personInstagram(JSON.parse(decodeHtml(schemaMatch[1])));if(found)return found}catch{}}
  // A WMT bio's own social list (roster-bio-social-links) comes first: the
  // page menu lists the school's team accounts before it (Auburn).
  const bio=String(raw).match(/class=["'][^"']*\broster-bio-social-links\b[\s\S]*?<\/ul>/i);
  // When the bio has its own list, the menu's accounts are never the athlete's.
  if(bio&&bio[0]!==raw)return verifiedInstagram(bio[0]);
  // The whole link is read: "instagram.com/Alex Gatto._" (Michigan) is a
  // broken link, not the account "alex". A link written inside another
  // ("instagram.com/https://www.instagram.com/wyattnovara", Michigan;
  // "instagram.com/www.instagram.com/chloe._.hooker/", Notre Dame) is the
  // inner one.
  // Miami's bios link "instagram.com/ruth_martinez_9", without a scheme.
  let m;const re=/<a\b[^>]*href=["']((?:https?:\/\/)?(?:www\.)?instagram\.com\/[^"']+)["'][^>]*>/gi;
  while((m=re.exec(raw))){
    // The site's menu links the team's account (Michigan State's
    // msu_baseball on every baseball profile): never the athlete's.
    if(/\bdata-s-nav-link\b|\bc-navigation__url\b/.test(m[0]))continue;
    try{
      const href=decodeHtml(m[1]).replace(/^(?!https?:)/i,'https://'),inner=(href.match(/^https?:\/\/(?:www\.)?instagram\.com\/((?:https?:\/\/)?(?:www\.)?instagram\.com\/.*)$/i)?.[1]||href).replace(/^(?!https?:)/i,'https://');
      const u=new URL(inner.replace(/ /g,'%20')),parts=u.pathname.split('/').filter(Boolean);
      const handle=(parts[0]||'').replace(/^@/,'').toLowerCase();
      // Only a valid handle: "merritt%20_zieminick" is a broken link.
      if(parts.length===1&&/^[a-z0-9._]{1,30}$/.test(handle)&&!BLOCKED_INSTAGRAM_HANDLES.has(handle))return`https://www.instagram.com/${handle}/`;
    }catch{}
  }
  return null;
}
async function instagramProfileImage(instagramUrl){
  if(!instagramUrl)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try{
    const r=await fetch(instagramUrl,{headers:HEADERS,redirect:'follow',signal:controller.signal});
    if(!r.ok)return null;
    const html=await r.text();
    const meta=html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)|<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    const imageUrl=absoluteUrl(meta?.[1]||meta?.[2],r.url||instagramUrl);
    if(!imageUrl||/(?:logo|placeholder|default|favicon|icon|brand)/i.test(decodeURIComponentSafe(imageUrl)))return null;
    return imageUrl;
  }catch{return null}finally{clearTimeout(timer)}
}
// Profile pages read per sport when roster cards hold fewer than three
// verified links.
const ATHLETE_PROFILE_BUDGET=24,OPENDORSE_BUDGET=18,NIL_LOOKUP_MS=10000;
// Each roster card's event group ("Distance", "DISTANCE/XC", "Cross
// Country/Distance", "Sprints"), by profile address: the text of the first
// element named for a position between the card's profile link and the next
// athlete's.
function rosterPositions(raw,base){
  const links=[...String(raw||'').matchAll(/href=["']([^"']*\/roster\/[^"'?#]+)["']/gi)].map(m=>({index:m.index,url:absoluteUrl(m[1],base)})).filter(link=>link.url);
  const positions=new Map();
  for(let i=0;i<links.length;i++){
    const {url,index}=links[i];if(positions.has(url))continue;
    let end=raw.length;for(let j=i+1;j<links.length;j++)if(links[j].url!==url){end=links[j].index;break;}
    // SIDEARM names the field in data-test-id ("…person-position-short", its
    // text after an sr-only "Position" label), WMT in its class
    // ("roster-player-list-profile-field--position").
    const card=raw.slice(index,end);
    const field=card.match(/(?:class|data-test-id)=["'][^"']*\bposition\b(?!-(?:relative|absolute|fixed|static|sticky))[^"']*["'][^>]*>([\s\S]{0,240})/i)
      ||card.match(/(?:class|data-test-id)=["'][^"']*position[^"']*["'][^>]*>([\s\S]{0,240})/i);
    const text=field?clean(decodeHtml(field[1].replace(/<span\b[^>]*sr-only[^>]*>[\s\S]*?<\/span>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/^(?:\s*<(?!\/)[^>]*>)*/,'').split('<')[0])):'';
    if(text)positions.set(url,text);
  }
  return positions;
}
// Cross Country and Track & Field publish one roster at Texas, Auburn,
// Alabama and Oklahoma State (user, October 8: "Texas is showing track
// athletes instead of cross country athletes"): Cross Country features its
// distance runners only.
const DISTANCE_GROUP=/\b(?:distance|cross[\s-]*country|xc)\b/i;
// Only when the athletes carry event groups: Cal Baptist's shared roster
// (Oct 22) gives positions to its coaches alone, which dropped every runner.
function distanceRunners(profiles,positions){
  return profiles.some(profile=>positions.get(profile.url))?profiles.filter(profile=>DISTANCE_GROUP.test(positions.get(profile.url)||'')):profiles;
}
async function featuredAthletes(schoolId,sport){
  const school=catalogSchool(schoolId);if(!school)return[];
  const started=Date.now();
  const sharedTrack=sport==='Cross Country'&&rosterUrls(school,sport).some(url=>rosterUrls(school,'Track & Field').includes(url));
  let profiles=[];
  const pinned=[...VERIFIED_TEAM_TAG_INSTAGRAM.keys()].filter(key=>key.startsWith(`${schoolId}|${sport}|`)).map(key=>key.split('|').slice(2).join('|'));
  for(const rosterUrl of rosterUrls(school,sport)){
    try{
      const r=await sourceFetch(rosterUrl,{},{ttl:SOURCE_TTL.listing});if(!r.ok)continue;
      const raw=await r.text();
      let discovered=rosterProfiles(raw,r.url||rosterUrl);
      if(sharedTrack)discovered=distanceRunners(discovered,rosterPositions(raw,r.url||rosterUrl));
      profiles.push(...discovered.filter(profile=>!profiles.some(existing=>existing.url===profile.url)));
      if(profiles.length&&!schoolCombinedSports(school).has(sport))break;
      // A pinned athlete on a later team's roster is read too (Michigan's
      // men's cross country runner after 18 women).
      if(profiles.length>=18&&pinned.every(name=>profiles.some(profile=>profile.name===name)))break;
    }catch{}
  }
  // Roster-card portraits are the most reliable source. Put those athletes
  // first, then retain the daily shuffle within each group.
  const overrideFor=profile=>profile.instagram_url||VERIFIED_TEAM_TAG_INSTAGRAM.get(`${schoolId}|${sport}|${profile.name}`)||null;
  profiles.sort((a,b)=>Number(Boolean(overrideFor(b)))-Number(Boolean(overrideFor(a)))||Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.url)-dailyRank(b.url));
  // Official roster-card social labels and official-team tags are already
  // identity verified. Return them without refetching many biography pages.
  // This keeps large football rosters within Worker request limits.
  const tagged=profiles.filter(profile=>overrideFor(profile)).map(profile=>({
    name:profile.name,
    instagram_url:overrideFor(profile),
    profile_url:profile.url,
    image_url:profile.image_url||null
  }));
  // Three verified Instagram athletes per sport (user, October 7: "I want
  // three"): roster cards with fewer send the search on to the profiles.
  if(tagged.length>=3){
    // The fast path must enforce the same identity rules as biography-page
    // discovery. Some publishers reuse a generic roster image across cards.
    const imageOwners=new Map(),socialOwners=new Map();
    for(const athlete of tagged){
      if(athlete.image_url){const key=athlete.image_url.replace(/#.*$/,'');if(!imageOwners.has(key))imageOwners.set(key,[]);imageOwners.get(key).push(athlete)}
      if(athlete.instagram_url){const key=athlete.instagram_url.toLowerCase().replace(/[?#].*$/,'');if(!socialOwners.has(key))socialOwners.set(key,[]);socialOwners.get(key).push(athlete)}
    }
    for(const owners of imageOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.image_url=null;
    for(const owners of socialOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.instagram_url=null;
    tagged.sort((a,b)=>Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.name)-dailyRank(b.name));
    const selected=tagged.filter(athlete=>athlete.instagram_url).slice(0,3);
    await Promise.all(selected.map(async athlete=>{
      if(athlete.image_url)return;
      try{const r=await sourceFetch(athlete.profile_url);if(r.ok)athlete.image_url=officialProfileImage(await r.text(),r.url||athlete.profile_url)}catch{}
    }));
    // Colorado's ski roster publishes only two personal Instagram links; the
    // third slot takes an official roster profile, as the slower path does.
    if(schoolModule(schoolId)?.school.profileFillSports?.has(sport)&&selected.length<3){
      const used=new Set(selected.map(athlete=>athlete.profile_url));
      selected.push(...profiles.filter(profile=>!used.has(profile.url)&&profile.image_url).sort((a,b)=>dailyRank(a.name)-dailyRank(b.name)).slice(0,3-selected.length)
        .map(profile=>({name:profile.name,instagram_url:null,profile_url:profile.url,image_url:profile.image_url})));
    }
    return selected;
  }
  // Athletes whose roster card already carries a verified link are kept
  // without refetching their pages.
  const found=tagged.map(athlete=>({...athlete})),known=new Set(found.map(athlete=>athlete.profile_url));
  const unread=profiles.filter(profile=>!known.has(profile.url));
  // Inspect deterministic roster batches until three verified athletes are
  // found. This avoids randomly skipping smaller teams while keeping large
  // football rosters within a safe official-site request budget.
  for(let start=0;start<Math.min(unread.length,ATHLETE_PROFILE_BUDGET)&&found.filter(a=>a.instagram_url).length<3;start+=3){
    await Promise.all(unread.slice(start,start+3).map(async profile=>{
      try{
        const r=await sourceFetch(profile.url);if(!r.ok)return;
        const html=await r.text(),instagram_url=verifiedInstagram(html)||overrideFor(profile);
        found.push({name:profile.name,instagram_url,profile_url:profile.url,image_url:officialProfileImage(html,r.url||profile.url)||athleteImage(html,r.url||profile.url,profile.name)||profile.image_url});
      }catch{}
    }));
  }
  // The school's official NIL marketplace (src/opendorse.mjs, src/inflcr.mjs):
  // roster athletes still without a verified link are looked up by name, at
  // most OPENDORSE_BUDGET a sport, until three athletes have Instagram.
  const nil=schoolModule(schoolId)?.school;
  const lookup=nil?.opendorse?{source:'opendorse',url:profile=>`${OPENDORSE_PROFILE}${opendorseSlug(profile.name)}`,read:async(r,profile)=>opendorseInstagram(await r.text(),{name:profile.name,team:nil.opendorse.team,sport,blocked:BLOCKED_INSTAGRAM_HANDLES})}
    :nil?.inflcr?{source:'inflcr',url:profile=>`${INFLCR_SCHOOLS}${nil.inflcr.school}/athletes?name=${encodeURIComponent(profile.name)}`,init:{headers:{accept:'application/json'}},read:async(r,profile)=>{let payload=null;try{payload=JSON.parse(await r.text())}catch{}return inflcrInstagram(payload,{name:profile.name,sport,blocked:BLOCKED_INSTAGRAM_HANDLES})}}
    :null;
  if(lookup&&found.filter(a=>a.instagram_url).length<3){
    const linked=new Set(found.filter(a=>a.instagram_url).map(a=>a.profile_url));
    const candidates=profiles.filter(profile=>!linked.has(profile.url)&&opendorseSlug(profile.name)).sort((a,b)=>Number(Boolean(b.image_url))-Number(Boolean(a.image_url))||dailyRank(a.name)-dailyRank(b.name)).slice(0,OPENDORSE_BUDGET);
    // Six at a time: a large roster's official pages already took most of
    // the request's time (Rutgers track, 13-15 s, Oct 16).
    // Only within the request's first NIL_LOOKUP_MS (Rutgers track took 22 s
    // to build when its official pages were slow, Oct 16).
    for(let start=0;start<candidates.length&&found.filter(a=>a.instagram_url).length<3&&Date.now()-started<NIL_LOOKUP_MS;start+=6){
      await Promise.all(candidates.slice(start,start+6).map(async profile=>{
        try{
          const r=await sourceFetch(lookup.url(profile),lookup.init||{},{ttl:SOURCE_TTL.document});if(!r.ok)return;
          const instagram_url=await lookup.read(r,profile);
          if(!instagram_url)return;
          const known=found.find(a=>a.profile_url===profile.url);
          if(known){known.instagram_url=instagram_url;known.instagram_source=lookup.source}
          else found.push({name:profile.name,instagram_url,profile_url:profile.url,image_url:profile.image_url||null,instagram_source:lookup.source});
        }catch{}
      }));
    }
  }
  // Final publisher-independent guard. Every portrait source—roster HTML,
  // embedded payload, profile markup, or Schema.org—must pass this check.
  for(const athlete of found)if(athlete.image_url&&/(?:logo|placeholder|default|favicon|icon|brand|pitchfork|powercat|sport[_-]?mark)/i.test(decodeURIComponentSafe(athlete.image_url)))athlete.image_url=null;
  // Global identity guard: one portrait cannot represent different athletes.
  // If a publisher supplies a shared page image, use safe initials instead.
  const imageOwners=new Map();
  for(const athlete of found){if(!athlete.image_url)continue;const key=athlete.image_url.replace(/#.*$/,'');if(!imageOwners.has(key))imageOwners.set(key,[]);imageOwners.get(key).push(athlete)}
  for(const owners of imageOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.image_url=null;
  // A shared social destination is a school or team account, not an athlete's
  // verified identity. Reject it even when the publisher changes handles.
  const socialOwners=new Map();
  for(const athlete of found){if(!athlete.instagram_url)continue;const key=athlete.instagram_url.toLowerCase().replace(/[?#].*$/,'');if(!socialOwners.has(key))socialOwners.set(key,[]);socialOwners.get(key).push(athlete)}
  for(const owners of socialOwners.values())if(new Set(owners.map(x=>x.name)).size>1)for(const athlete of owners)athlete.instagram_url=null;
  const ranked=found.filter(a=>a.instagram_url).sort((a,b)=>dailyRank(a.name)-dailyRank(b.name));
  const selected=[...ranked.filter(a=>a.image_url),...ranked.filter(a=>!a.image_url)].slice(0,3);
  await Promise.all(selected.map(async athlete=>{if(!athlete.image_url)athlete.image_url=await instagramProfileImage(athlete.instagram_url)}));
  // Some official publishers provide current roster portraits and profile
  // pages without publishing personal social links. Keep the carousel useful
  // in that case by filling the remaining slots with official roster profiles.
  // Personal Instagram links are still shown only when identity verified.
  const used=new Set(selected.map(athlete=>athlete.profile_url));
  // Profile pages read above lend their portrait to a roster row that has
  // none (Arkansas's roster tables publish no images).
  const portraits=new Map(found.filter(athlete=>athlete.image_url).map(athlete=>[athlete.profile_url,athlete.image_url]));
  const officialProfiles=profiles
    .map(profile=>profile.image_url||!portraits.has(profile.url)?profile:{...profile,image_url:portraits.get(profile.url)})
    .filter(profile=>!used.has(profile.url)&&profile.image_url)
    .sort((a,b)=>dailyRank(a.name)-dailyRank(b.name))
    .map(profile=>({name:profile.name,instagram_url:null,profile_url:profile.url,image_url:profile.image_url}));
  // A module may let profiles without a published portrait fill the slots
  // (California's gymnastics rosters, Oct 14: no athlete photos yet); the
  // page shows initials.
  if(schoolModule(schoolId)?.school.portraitlessProfileSports?.has(sport)){
    const shown=new Set([...selected,...officialProfiles].map(athlete=>athlete.profile_url));
    officialProfiles.push(...profiles.filter(profile=>!shown.has(profile.url)).sort((a,b)=>dailyRank(a.name)-dailyRank(b.name))
      .map(profile=>({name:profile.name,instagram_url:null,profile_url:profile.url,image_url:null})));
  }
  return [...selected,...officialProfiles].slice(0,3);
}
function candidateUrls(school,sport){const known=KNOWN_URLS.get(`${school.id}|${sport}`);if(known)return Array.isArray(known)?known:[known];const out=[],base=school.athletics_url.replace(/\/$/,'');for(const p of (SPORT_PATHS[sport]||[slug(sport)]))out.push(`${base}/sports/${p}/schedule`);out.push(`${base}/`);return[...new Set(out)];}
function parsedSourceDate(dateText,timeText){
  const m=String(dateText||'').match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if(!m)return null;
  const months={jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
  const month=months[m[1].toLowerCase()];
  if(month==null)return null;
  let hour=12,minute=0,hasTime=false;
  if(timeText){
    // A zone after the clock ("7 p.m. CT", KU, Oct 29) is the school's own:
    // every KU time read TBA without it. "Noon" is 12 p.m.
    const t=String(timeText).replace(/\./g,'').trim().replace(/\s+\(?(?:[ECMP][SD]?T|AK[SD]?T|H[SD]?T|local)\)?$/i,'').replace(/^noon$/i,'12 pm').match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if(t){hour=Number(t[1])%12+(t[3].toLowerCase()==='pm'?12:0);minute=Number(t[2]||0);hasTime=true;}
  }
  return{year:Number(m[3]),month,day:Number(m[2]),hour,minute,hasTime};
}
function parseDate(dateText,timeText){const p=parsedSourceDate(dateText,timeText);return p?new Date(Date.UTC(p.year,p.month,p.day,p.hour,p.minute)).toISOString():null;}
function formatSourceDate(dateText,timeText){
  const p=parsedSourceDate(dateText,timeText);if(!p)return clean([dateText,timeText].filter(Boolean).join(', '));
  const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month];
  if(!p.hasTime)return `${month} ${p.day}`;
  const hour=p.hour%12||12,period=p.hour>=12?'PM':'AM';
  return `${month} ${p.day}, ${hour}:${String(p.minute).padStart(2,'0')} ${period}`;
}
const VERIFIED_GAME_DETAILS=new Map(Object.entries({
  ...kstateSchool.verifiedGameDetails,
  'texas-tech|Volleyball|2026-09-05|nevada':{
    source_url:'https://texastech.com/news/2026/9/5/womens-volleyball-tech-bounces-back-against-wolfpack',
    highlights:[
      'Texas Tech defeated Nevada 3-2 after winning the deciding fifth set 15-9.',
      'Kenna McKenzie matched her career high with 23 kills, and Tatum Johnson added a career-high 10.',
      'The Red Raiders finished with 63 kills, nine aces and 10 blocks while holding Nevada to a .171 hitting percentage.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 63 · Nevada 57'},{label:'Hitting percentage',value:'Texas Tech .265 · Nevada .171'},{label:'Aces',value:'Texas Tech 9 · Nevada 3'},{label:'Blocks',value:'Texas Tech 10 · Nevada 8'}]
  },
  'texas-tech|Volleyball|2026-09-04|sacramento-state':{
    source_url:'https://texastech.com/news/2026/9/4/womens-volleyball-red-raiders-fall-to-hornets',
    highlights:[
      'Sacramento State defeated Texas Tech in three closely contested sets, 25-22, 26-24 and 27-25.',
      'Shelby Ignash led Texas Tech with nine kills while hitting .467 and matching her career high.',
      'Katelyn Cochran recorded 34 assists, and Emily Contreras led the Red Raiders with 12 digs.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 39 · Sacramento State 50'},{label:'Hitting percentage',value:'Texas Tech .267 · Sacramento State .299'},{label:'Assists',value:'Texas Tech 37 · Sacramento State 47'},{label:'Blocks',value:'Texas Tech 5 · Sacramento State 4'}]
  },
  'texas-tech|Volleyball|2026-09-03|saint-mary-s':{
    source_url:'https://texastech.com/news/2026/9/3/womens-volleyball-freshmen-continue-to-shine-in-red-raiders-win',
    highlights:[
      'Texas Tech defeated Saint Mary’s 3-1, winning the final two sets 25-18 and 25-20.',
      'Sara Bowcutt posted 21 kills and Elia Dinsmore added 14 as the freshman duo combined for 35.',
      'Katelyn Cochran recorded 42 assists and nine digs, while Shelby Ignash finished with eight blocks.'
    ],
    stats:[{label:'Set scores',value:'25-23 · 20-25 · 25-18 · 25-20'},{label:'Bowcutt kills',value:'21'},{label:'Dinsmore kills',value:'14'},{label:'Cochran assists',value:'42'}]
  },
  'texas-tech|Volleyball|2026-08-29|st-thomas':{
    source_url:'https://texastech.com/news/2026/8/29/womens-volleyball-tech-holds-on-to-beat-st-thomas',
    highlights:[
      'Texas Tech defeated St. Thomas 3-2 after taking the deciding fifth set 17-15.',
      'Five Red Raiders recorded double-digit digs, and Taylor Cook, Sara Bowcutt and Elia Dinsmore posted double-doubles.',
      'Dinsmore finished with 14 kills and 12 digs, while Bowcutt led Texas Tech with 15 kills.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 54 · St. Thomas 54'},{label:'Digs',value:'Texas Tech 77'},{label:'Blocks',value:'Texas Tech 11'},{label:'Cook assists',value:'42'}]
  },
  'texas-tech|Volleyball|2026-08-28|wyoming':{
    source_url:'https://texastech.com/news/2026/8/28/womens-volleyball-red-raiders-drops-season-opener-to-cowgirls',
    highlights:[
      'Wyoming defeated Texas Tech 3-1 in the season opener.',
      'Sara Bowcutt led the Red Raiders with 12 kills and three aces in her collegiate debut.',
      'Texas Tech won the second set 25-14 before Wyoming closed the match with wins in sets three and four.'
    ],
    stats:[{label:'Kills',value:'Texas Tech 34 · Wyoming 50'},{label:'Hitting percentage',value:'Texas Tech .074 · Wyoming .276'},{label:'Aces',value:'Texas Tech 6 · Wyoming 5'},{label:'Blocks',value:'Texas Tech 8 · Wyoming 10'}]
  },
  'texas-tech|Football|2026-09-05|abilene-christian':{
    source_url:'https://texastech.com/news/2026/9/5/football-texas-tech-tops-acu-in-season-opener-33-10',
    highlights:[
      'Will Hammond completed 26 of 33 passes for 298 yards and a touchdown in Texas Tech’s 33-10 win.',
      'Quinten Joyner and J’Koby Williams scored first-quarter rushing touchdowns as Texas Tech built a 14-0 lead.',
      'Texas Tech held Abilene Christian to 194 total yards while Stone Harrington made four field goals.'
    ],
    stats:[
      {label:'Total yards',value:'Texas Tech 471 · ACU 194'},
      {label:'Passing yards',value:'Texas Tech 298 · ACU 119'},
      {label:'Rushing yards',value:'Texas Tech 173 · ACU 75'},
      {label:'First downs',value:'Texas Tech 26 · ACU 15'}
    ]
  }
}));
function enrichGameEvent(event){
  if(event.event_type!=='GAME'||event.status!=='Final')return event;
  const detail=VERIFIED_GAME_DETAILS.get(`${event.school_id}|${event.sport}|${event.start_time?.slice(0,10)||''}|${slug(event.opponent||'')}`);
  if(!detail)return event;
  event.highlights=detail.highlights;
  event.highlights_verified=true;
  event.game_stats=detail.stats;
  event.recap_url=detail.source_url;
  event.source={...event.source,name:'Official athletics game recap'};
  return event;
}
function enrichMeetEvent(event,date){
  if(event.event_type!=='MEET'||event.status!=='Final')return event;
  if(applyVerifiedKansasMeet(event))return event;
  if(applyVerifiedKStateMeet(event))return event;
  const label=event.headline||'';
  const teamRows=meetTeamResultRows(label,event.school);
  if(teamRows.length){event.results=teamRows;event.result_count=teamRows.length;}
  return event;
}
function meetTeamResultRows(label,school){
  const text=clean(label)||'',rows=[],seen=new Set();
  const add=(division,result)=>{
    result=clean(result)?.replace(/^[:\-–—|]+|[:\-–—|]+$/g,'').trim();
    if(!result||/^(?:a\.?m\.?|p\.?m\.?)\b/i.test(result)||/^\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)$/i.test(result))return;
    const group=/^(?:m|men|men's)$/i.test(division)?"Men's Team":"Women's Team",key=`${group}|${result}`;
    if(seen.has(key))return;seen.add(key);rows.push({group,participant:`${school} team`,result});
  };
  // Official publishers use several compact formats for meet finishes:
  // M (1st) / W (2nd), M: 1st | W: 2nd, Men 1st (24) | Women 1st (31),
  // and Men: 1st Women: 2nd.
  for(const m of text.matchAll(/\b(M|W)\s*\(([^)]+)\)/gi))add(m[1],m[2]);
  for(const m of text.matchAll(/\b(M|W)\s*:\s*((?:\d+(?:st|nd|rd|th)|champion|runner-up|no team scores?)(?:\s*\([^)]*\))?)/gi))add(m[1],m[2]);
  for(const m of text.matchAll(/\b(M|W)\s*[-–—]\s*((?:\d+(?:st|nd|rd|th)|champion|runner-up|NTS|no team scores?)(?:\s*\([^)]*\))?)/gi))add(m[1],/^NTS$/i.test(m[2])?'No team score':m[2]);
  for(const m of text.matchAll(/\b(Men(?:'s)?|Women(?:'s)?)\s*:?[ \t]+((?:\d+(?:st|nd|rd|th)|champion|runner-up)(?:\s*\([^)]*\))?)/gi))add(m[1],m[2]);
  return rows;
}
function ordinal(value){
  const n=Number(value);if(!Number.isFinite(n))return clean(value);
  const mod100=n%100,suffix=mod100>=11&&mod100<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');
  return `${n}${suffix}`;
}
function officialSchoolNames(school){
  return [school.id,school.name,school.short_name,...(school.aliases||[])].map(matchText).filter(Boolean);
}
function schoolNameMatches(value,school){
  const name=matchText(value),wanted=officialSchoolNames(school);
  return wanted.includes(name)||wanted.some(x=>x.length>=5&&(name.startsWith(`${x} `)||x.startsWith(`${name} `)));
}
function tableRows(table){
  const rows=[];let match;
  const re=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  while((match=re.exec(table||''))){
    const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>visibleText(x[1]));
    if(cells.length)rows.push(cells);
  }
  return rows;
}
function parseTfrrsCrossCountryResults(raw,school){
  const results=[];let match;
  const sections=/<h3\b[^>]*>([\s\S]*?(?:Team|Individual) Results[\s\S]*?)<\/h3>[\s\S]{0,4000}?<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  while((match=sections.exec(raw||''))){
    const heading=visibleText(match[1]),meta=heading.match(/\b(Men|Women)\s+([^()]*?)\s+(Team|Individual) Results\b/i);
    if(!meta)continue;
    const group=`${meta[1][0].toUpperCase()+meta[1].slice(1).toLowerCase()}'s ${clean(meta[2])}`;
    if(meta[3].toLowerCase()==='team'){
      for(const cells of tableRows(match[2])){
        if(cells.length<5||!schoolNameMatches(cells[1],school))continue;
        results.push({group,participant:`${school.name} team`,result:`${ordinal(cells[0])} · ${cells[4]} pts`});
      }
    }else{
      for(const cells of tableRows(match[2])){
        if(cells.length<6||!schoolNameMatches(cells[3],school))continue;
        results.push({group,participant:cells[1],result:`${ordinal(cells[0])} · ${cells[5]}`});
      }
    }
  }
  return results;
}
function crossCountryEventDate(event){
  const date=new Date(event?.start_time||event?.display_time||'');
  return Number.isNaN(date.getTime())?null:`${date.getUTCMonth()+1}/${date.getUTCDate()}`;
}
function pdfDivisionAt(text,index){
  const before=text.slice(Math.max(0,index-2500),index);
  const labels=[...before.matchAll(/\b(MEN(?:'S)?|WOMEN(?:'S)?)\b/gi)];
  if(labels.length)return/^men/i.test(labels.at(-1)[1])?"Men's":"Women's";
  return "Women's";
}
function pdfAthleteBlocks(text){
  const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),blocks=[];
  const classYear=/^(?:redshirt\s+)?(?:freshman|sophomore|junior|senior|graduate(?: student)?|fifth year)$/i;
  for(let i=0;i<lines.length-2;i++){
    if(!/^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]{1,30}$/.test(lines[i])||!/^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’ .-]{1,40}$/.test(lines[i+1]))continue;
    const yearOffset=lines.slice(i+2,i+7).findIndex(x=>classYear.test(x));
    if(yearOffset<0)continue;
    blocks.push({line:i,name:`${lines[i]} ${lines[i+1]}`});
  }
  return{lines,blocks};
}
function parseCrossCountryPdfResults(text,event,school){
  const date=crossCountryEventDate(event);if(!date)return[];
  const {lines,blocks}=pdfAthleteBlocks(text),rows=[],seen=new Set();
  const dateRe=new RegExp(`^${date.replace('/','\\/')}\\b`),timeRe=/\b(\d{1,2}:\d{2}(?:\.\d+)?)\b/,placeRe=/\b(\d+)(?:st|nd|rd|th)\b/i;
  const add=(group,participant,result)=>{const key=`${group}|${participant}|${result}`;if(!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  // Cumulative-results PDFs commonly start with one meet-summary row. Preserve
  // its published team place before the individual athlete blocks.
  const firstAthlete=blocks[0]?.line??lines.length;
  for(let i=0;i<firstAthlete;i++){
    const line=lines[i];if(!dateRe.test(line))continue;
    const place=line.match(placeRe);if(!place)continue;
    const division=pdfDivisionAt(text,text.indexOf(line));
    add(`${division} Team`,`${school.name} team`,ordinal(place[1]));
  }
  for(let b=0;b<blocks.length;b++){
    const current=blocks[b],end=blocks[b+1]?.line??lines.length;
    const section=lines.slice(current.line,end),division=pdfDivisionAt(text,text.indexOf(lines[current.line]));
    for(const line of section){
      if(!dateRe.test(line)||/---/.test(line))continue;
      const time=line.match(timeRe),place=line.match(placeRe);
      if(time&&place)add(`${division} Individual Results`,current.name,`${ordinal(place[1])} · ${time[1]}`);
    }
  }
  return rows;
}
function pdfSchoolPattern(school){
  const variants=[school.short_name,school.name,...(school.aliases||[]),school.id.replaceAll('-',' ')]
    .map(clean).filter(x=>x&&x.length>=3).sort((a,b)=>b.length-a.length)
    .map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'));
  return variants.length?new RegExp(`\\b(?:${variants.join('|')})\\b`,'i'):null;
}
function parseCrossCountryFlatPdfResults(text,school){
  const schoolRe=pdfSchoolPattern(school);if(!schoolRe)return[];
  const lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean),rows=[],seen=new Set();
  let division=null,section=null,timeMode='only';
  const add=(group,participant,result)=>{const key=`${group}|${participant}|${result}`;if(!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  for(const line of lines){
    if(/\bWomen(?:'s|s)?\b/i.test(line))division="Women's";
    else if(/\bMen(?:'s|s)?\b/i.test(line))division="Men's";
    if(/\bTeam Scores?\b/i.test(line)){section='team';continue}
    if(/\bIndividual Results?\b|\bResults\s*-\s*(?:Women|Men)\b/i.test(line)){section='individual';continue}
    if(/\bAv(?:erage)?\s+Mile\b|\bAv\s+Km\b/i.test(line))timeMode='first';
    else if(/\+\/-.*\bTime\b/i.test(line))timeMode='last';
    if(!division||!/^\d+\s/.test(line)||!schoolRe.test(line))continue;
    const place=(line.match(/^(\d+)/)||[])[1];if(!place)continue;
    const schoolAt=line.search(schoolRe);if(schoolAt<0)continue;
    if(section==='team'){
      const after=line.slice(schoolAt).replace(schoolRe,'').trim(),points=(after.match(/^(\d+)\b/)||[])[1];
      if(points)add(`${division} Team`,`${school.name} team`,`${ordinal(place)} · ${points} pts`);
      continue;
    }
    const before=line.slice(0,schoolAt).replace(/^\d+\s+/,'').replace(/^\(?\d+\)?\s+/,'').replace(/^--\s+/,'').replace(/^#\d+\s+/,'').trim();
    const athlete=(before.match(/^(.*?)\s+(?:Fr|So|Jr|Sr|Gr|Graduate(?: Student)?|Freshman|Sophomore|Junior|Senior)$/i)||[])[1];
    if(!athlete||athlete.length<3)continue;
    const after=line.slice(schoolAt).replace(schoolRe,'').trim(),times=[...after.matchAll(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g)].map(x=>x[0]);
    const time=timeMode==='last'?times.at(-1):times[0];if(!time)continue;
    const participant=athlete.includes(',')?athlete.split(',').map(clean).reverse().join(' '):athlete;
    add(`${division} Individual Results`,participant,`${ordinal(place)} · ${time}`);
  }
  return rows;
}
async function fetchOfficialPdfText(resultUrl){
  let response=await sourceFetch(resultUrl,{},{ttl:SOURCE_TTL.document});if(!response.ok)return null;
  let type=response.headers.get('content-type')||'',bytes;
  if(/application\/pdf/i.test(type))bytes=new Uint8Array(await response.arrayBuffer());
  else{
    const html=await response.text(),decoded=html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    const urls=[...decoded.matchAll(/https?:\/\/[^"'<> ]+\.pdf(?:\?[^"'<> ]*)?/gi)].map(x=>x[0]);
    const asset=urls.find(x=>{try{return new URL(x).hostname!==new URL(resultUrl).hostname}catch{return false}})||urls.at(-1);
    if(!asset)return null;
    response=await sourceFetch(asset,{},{ttl:SOURCE_TTL.document});if(!response.ok||!/application\/pdf/i.test(response.headers.get('content-type')||''))return null;
    bytes=new Uint8Array(await response.arrayBuffer());
  }
  if(!bytes||bytes.byteLength>12*1024*1024)return null;
  const extracted=await extractText(bytes,{mergePages:true});
  return typeof extracted.text==='string'?extracted.text:null;
}
async function attachOfficialMeetResults(event){
  // K-State's recap contains both divisions. A single linked PDF can contain
  // only women and must never replace the event's complete recap table.
  if(isKStateCrossCountry(event))return attachKStateRecapResults(event);
  // School modules with their own official results path (Oklahoma State's
  // results document, Utah's recap tables, TFRRS, ...).
  const crossCountry=moduleCrossCountry(event);if(crossCountry)return crossCountry.attach(event);
  const own=SCHOOL_MODULES.flatMap(entry=>entry.results||[]).find(hook=>hook.matches(event));if(own)return own.attach(event);
  if(event?.event_type!=='MEET'||event.status!=='Final'||!event.result_url)return event;
  // Exact rows parsed from the event's official recap are already tied to this
  // meet. Never replace them with a season/cumulative PDF linked from it.
  if(event.recap_result_count>0&&event.results?.length)return event;
  try{
    const url=new URL(event.result_url);
    const school=catalogSchool(event.school_id);let rows=[];
    if(/(^|\.)tfrrs\.org$/i.test(url.hostname)){
      const response=await sourceFetch(url);if(response.ok)rows=parseTfrrsCrossCountryResults(await response.text(),school);
    }else{
      // SIDEARM commonly exposes official documents through a landing URL such
      // as /documents/YYYY/M/D/file.pdf. The response itself can be HTML before
      // redirecting or embedding the PDF asset, so do not require the requested
      // URL to end in .pdf before using the document resolver.
      const text=await fetchOfficialPdfText(url.href);
      if(text){const flat=parseCrossCountryFlatPdfResults(text,school);rows=flat.length>=2?flat:parseCrossCountryPdfResults(text,event,school);}
    }
    if(rows.length){event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;event.meet_results_verified=true;}
  }catch{}
  return event;
}
function discoverOfficialMeetResultUrl(raw,base){
  const candidates=[];let match;
  const html=String(raw||'').replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
  const links=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,500}?)<\/a>/gi;
  while((match=links.exec(html))){
    const label=visibleText(match[2]),url=absoluteUrl(match[1],base);
    if(!url)continue;
    if(/\b(?:results?|final results?|meet results?)\b/i.test(label)||/(?:tfrrs\.org\/results\/xc\/|\/documents\/.*\.pdf(?:$|[?#]))/i.test(url))candidates.push(url);
  }
  return candidates.find(x=>/tfrrs\.org\/results\/xc\//i.test(x))||candidates.find(x=>/\.pdf(?:$|[?#])/i.test(x))||candidates[0]||null;
}
const FALL_SEASON_SPORTS=new Set(['Football','Volleyball',"Women's Volleyball","Men's Volleyball",'Soccer',"Women's Soccer","Men's Soccer",'Cross Country','Field Hockey']);
const ACADEMIC_YEAR_SPORTS=new Set(['Basketball',"Men's Basketball","Women's Basketball",'Swimming & Diving','Wrestling','Tennis','Golf','Track & Field','Baseball','Softball','Rowing','Gymnastics','Hockey']);
function activeFallSeasonYear(now){return now.getUTCMonth()+1>=7?now.getUTCFullYear():now.getUTCFullYear()-1;}
function filterActiveSeason(events,sport,now){
  if(FALL_SEASON_SPORTS.has(sport)){
    const year=activeFallSeasonYear(now);
    return events.filter(e=>!e.start_time||new Date(e.start_time).getUTCFullYear()===year);
  }
  if(ACADEMIC_YEAR_SPORTS.has(sport)){
    const year=now.getUTCFullYear(),startYear=now.getUTCMonth()+1>=7?year:year-1;
    return events.filter(e=>{if(!e.start_time)return true;const date=new Date(e.start_time),eventYear=date.getUTCFullYear(),month=date.getUTCMonth()+1;return(eventYear===startYear&&month>=7)||(eventYear===startYear+1&&month<=6)});
  }
  return events;
}
function eventType(sport){if(['Cross Country','Track & Field','Golf','Gymnastics','Fencing','Bowling','Rifle','Skiing','Triathlon'].includes(sport))return'MEET';if(['Wrestling','Tennis','Swimming & Diving','Rowing','Equestrian','Beach Volleyball','Acrobatics & Tumbling','STUNT'].includes(sport))return'DUAL';return'GAME';}
function makeEvent({school,sport,status,relation,opponent,date,time,schoolScore,oppScore,resultText,sourceUrl,now}){
  const start=parseDate(date,time);
  let resultLabel=clean(resultText),hasScore=schoolScore!=null&&oppScore!=null;
  let hasOutcome=/^(?:W|L|T|D)(?:\b|\s*,)|^(?:Win|Loss|Tie|Draw)\b/i.test(resultLabel||'');
  let effective=hasScore||hasOutcome?'Final':status;
  // Publisher cards occasionally leak the preceding game's score into a
  // future matchup. The official event date is authoritative: a game after
  // today cannot be a final and must not retain an inherited score/outcome.
  const today=schoolToday(now,school);
  const eventDay=start?Date.parse(start.slice(0,10)+'T00:00:00Z'):NaN;
  if(eventType(sport)==='GAME'&&Number.isFinite(eventDay)&&eventDay>today){
    effective='Upcoming';schoolScore=null;oppScore=null;resultLabel=null;hasScore=false;hasOutcome=false;
  }
  if(eventType(sport)==='GAME'&&effective==='Final'&&!hasScore&&!hasOutcome)effective='Upcoming';
  if(effective==='Upcoming'&&start){const a=new Date(start),b=schoolNow(now,school);if(a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate())effective='Today';}
  const event={id:'live-'+slug(`${school.id}|${sport}|${date||''}|${opponent}|${effective}`).slice(0,180),school_id:school.id,school:school.name,sport,event_type:eventType(sport),status:effective,title:`${school.short_name} ${String(relation).toLowerCase()==='at'?'at':'vs'} ${opponent}`,start_time:start,display_time:formatSourceDate(date,time),opponent,school_score:schoolScore||null,opponent_score:oppScore||null,headline:resultLabel||(schoolScore&&oppScore?`${schoolScore}–${oppScore}`:null),team_summaries:[],results:resultLabel?[{label:'Result',value:resultLabel}]:[],result_count:resultLabel?1:0,source:{name:'Official athletics live schedule',url:sourceUrl,updated_at:now.toISOString()},has_more_results:false,enrichment_warning:null,priority_bucket:{Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[effective]||'other',recency_label:{Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[effective]||effective,last_verified_at:now.toISOString(),freshness_seconds:0,verification_state:'live_source',source_count:1,conflicting_sources:false};
  return enrichGameEvent(enrichMeetEvent(event,date));
}
// High schools (src/high-school.mjs): the school's calendar is the schedule
// and MaxPreps the scores. Each high school's module names its calendar, its
// MaxPreps team pages and the varsity teams of each sport.
const HIGH_SCHOOL_MODULES=[manhattanKsSchool,anthonyMsSchool,eisenhowerMsSchool,...RILEY_POTTAWATOMIE_HIGH_SCHOOLS,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS,...KAS_KS_HIGH_SCHOOLS];
const highSchoolModule=id=>HIGH_SCHOOL_MODULES.find(module=>module.id===id)||null;
// Middle schools have their own level (October 21) and the same readers.
const isHighSchool=school=>school?.level==='high-school'||school?.level==='middle-school';
const isPro=school=>school?.level==='pro';
const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function highSchoolDateText(date){const [y,m,d]=date.split('-').map(Number);return`${MONTH_NAMES[m-1]} ${d}, ${y}`;}
function highSchoolDisplayTime(date,time){const [,m,d]=date.split('-').map(Number),day=`${MONTH_NAMES[m-1]} ${d}`;if(!time)return day;const [h,min]=time.split(':').map(Number);return`${day}, ${h%12||12}:${String(min).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
// The school year a high school feed shows: July through June.
function highSchoolYear(now,school){const local=schoolNow(now,school),y=local.getUTCFullYear(),start=local.getUTCMonth()+1>=7?y:y-1;return{start:`${start}-07-01`,end:`${start+1}-06-30`};}
// One calendar game and its MaxPreps contest: the same day, and the same
// opponent when the day has more than one (calendar "Wichita North" is
// MaxPreps "North"; "Topeka High" is "Topeka").
function matchContest(game,contests,used){
  const day=contests.filter(c=>c.date===game.date&&!used.has(c));
  if(day.length<=1)return day[0]||null;
  const key=nameKey(game.name),words=new Set(key.split(' '));
  return day.find(c=>nameKey(c.opponent)===key)||day.find(c=>c.opponent&&nameKey(c.opponent).split(' ').every(w=>words.has(w)))||null;
}
// Middle and high schools (user, October 25: "We may need a new rule for
// middle school and high school", then "Go with 1"): a past game or meet no
// source has a result for is listed as played, "No score posted" (a meet:
// "No results posted"), and takes its score when MaxPreps, Bound, a timer,
// Prep.Golf, TennisReporting or SAS Scorer posts one. K-State's rule (not
// listed) stays for college. A placeholder the school's schedule held for a
// round it never reached (a playoff round, "TBD") is not a game played.
const HIGH_SCHOOL_PLACEHOLDER=/^(?:tbd|tba|regionals?|sectionals?|sub-?state|state|playoffs?|(?:1st|2nd|first|second) round|quarter-?finals?|semi-?finals?|finals?)\b|\b(?:regional|sub-?state|state|playoff|postseason)\b.*\b(?:football|volleyball|basketball|baseball|softball|tourney|tournament|round)\b|\bpostseason\b|^\d?a? ?(?:regionals?|sub-?state|state)\b/i;
const isHighSchoolPlaceholder=(name,{lone=false}={})=>lone||HIGH_SCHOOL_PLACEHOLDER.test(String(name||'').trim())||/(?<!sub[- ]?)\bstate\b/i.test(String(name||''));
function highSchoolEvent({school,sport,team,date,time,endDate,opponent,relation,named,contest,results=null,sourceUrl,sourceName='Official school calendar',placeholder=false,now}){
  const today=schoolToday(now,school),day=Date.parse(`${date}T00:00:00Z`),lastDay=endDate?Date.parse(`${endDate}T00:00:00Z`):day;
  const result=contest?.result||null,scored=result&&contest.score!=null&&contest.opponent_score!=null;
  let status,unscored=false;
  if(scored)status='Final';
  else if(day>today)status='Upcoming';
  // A track meet under way with results posted reads live (LetsGoRun).
  else if(lastDay>=today)status=results?.live&&results.rows?.length?'Live':'Today';
  else if(results?.rows?.length)status='Final';
  // A playoff game round may never have been reached; a meet's regional or
  // sub-state is run by every team, its state meet only by qualifiers.
  else if(placeholder||(eventType(sport)==='GAME'?isHighSchoolPlaceholder(opponent):/(?<!sub-?)\bstate\b/i.test(opponent)))return null;
  else{status='Final';unscored=true;}
  const noResult=eventType(sport)==='GAME'?'No score posted':'No results posted';
  const headline=scored?`${result}, ${contest.score}-${contest.opponent_score}`:unscored?noResult:(results?.headline||null);
  const dateText=highSchoolDateText(date),title=`${team?`${team} · `:''}${school.short_name} ${relation} ${opponent}`;
  const rows=scored?[{label:'Result',value:headline}]:unscored?[{label:eventType(sport)==='GAME'?'Score':'Results',value:'Not posted yet'}]:(results?.rows||[]);
  const event={id:'live-'+slug(`${school.id}|${sport}|${team||''}|${dateText}|${opponent}|${status}`).slice(0,180),school_id:school.id,school:school.name,sport,event_type:eventType(sport),status,title,start_time:`${date}T${time||'12:00'}:00.000Z`,display_time:highSchoolDisplayTime(date,time),opponent,school_score:scored?String(contest.score):null,opponent_score:scored?String(contest.opponent_score):null,headline,team_summaries:[],results:rows,result_count:rows.length,source:{name:sourceName,url:sourceUrl,updated_at:now.toISOString()},has_more_results:false,enrichment_warning:null,priority_bucket:{Today:'today',Upcoming:'upcoming',Final:'recent_final'}[status],recency_label:{Today:'Today',Upcoming:'Upcoming',Final:'Final'}[status],last_verified_at:now.toISOString(),freshness_seconds:0,verification_state:'live_source',source_count:contest||results?2:1,conflicting_sources:false};
  if(endDate)event.end_time=`${endDate}T23:59:00.000Z`;
  if(team)event.team_label=team;
  if(status==='Live'){event.meet_live=true;event.recency_label=results.live_label;event.live_latest=results.latest;const source=results.source_name||'LetsGoRun Timing (MeetPro)';event.live_score_source=source;event.highlight_status=`Live: results as ${source.replace(/ \((.*)\)$/,' posts them ($1)')}.`;}
  if(scored){
    event.score_source=contest.source==='bound'?{name:'Bound (score entered by the school)',url:contest.source_url||null,bound:true}:{name:'MaxPreps (score reported by the team)',url:contest.game_url||null};
    if(contest.game_url){event.recap_url=contest.game_url;event.recap_label='View MaxPreps game page';}
    else if(contest.source==='bound'&&contest.source_url){event.recap_url=contest.source_url;event.recap_label='View on Bound';}
    // An independent school has no league record (MaxPreps may still flag games).
    if(contest.conference!=null&&!/^independent$/i.test(school.conference||'')){event.conference_game=contest.conference;if(contest.conference)event.conference_name=school.conference;}
    if(contest.tournament)event.tournament_game=true;
  }
  if(results){
    event.recap_url=results.url;event.recap_label=results.label;
    event.highlights=results.highlights;event.highlights_verified=true;event.highlight_status=results.note;
    event.meet_results_verified=true;
  }
  if(unscored){event.no_result_posted=true;event.highlight_status='Played; no score or result has been posted by MaxPreps, Bound, a timer or the school.';}
  if(contest?.stream_url)event.stream_url=contest.stream_url;
  if(contest&&contest.source!=='bound')event.maxpreps_url=contest.game_url||null;
  return event;
}
// The expanded view of a high school final: plain facts from the score and
// the MaxPreps box score, written from the school's side.
// Period names as the box score heads them: football quarters (Q1),
// soccer halves (1, 2, then overtime) and volleyball sets (S1).
function periodName(sport,period){
  if(/^S(\d+)$/i.test(period))return`Set ${period.slice(1)}`;
  if(sport==='Soccer'&&/^\d+$/.test(period))return Number(period)===1?'1st half':Number(period)===2?'2nd half':`OT ${Number(period)-2}`;
  return period;
}
function highSchoolHighlights(event,box){
  const name=event.school.replace(/ High School$/,''),us=Number(event.school_score),them=Number(event.opponent_score);
  const verb=us>them?'beat':us<them?'lost to':'tied',where=event.tournament_game?'':/ at /.test(event.title)?' on the road':' at home';
  const league=event.conference_game?` in a ${event.conference_name||'league'} game`:event.tournament_game?' in a tournament match':'';
  const lines=[`${name} ${verb} ${event.opponent} ${Math.max(us,them)}-${Math.min(us,them)}${where}${league}.`];
  const stats=[];
  if(box){
    const ours=box.teams.find(t=>nameKey(t.name)===nameKey(name))||box.teams.find(t=>nameKey(name).includes(nameKey(t.name))),theirs=box.teams.find(t=>t!==ours);
    if(ours&&theirs){
      const periods=box.periods.map((p,i)=>({p,i})).filter(({p})=>!/^(?:final|t|total|wins)$/i.test(p));
      const score=(team,i)=>Number(team.scores[i]||0);
      periods.forEach(({p,i})=>stats.push({label:periodName(event.sport,p),value:`${name} ${ours.scores[i]} · ${event.opponent} ${theirs.scores[i]}`}));
      if(event.sport==='Volleyball'&&periods.length)lines.push(`Set scores: ${periods.map(({i})=>`${score(ours,i)}-${score(theirs,i)}`).join(', ')}.`);
      const half=/^Q/i.test(periods[0]?.p||'')&&periods.length>=4?2:event.sport==='Soccer'&&periods.length>=2?1:null;
      if(half){const a=periods.slice(0,half).reduce((t,{i})=>t+score(ours,i),0),b=periods.slice(0,half).reduce((t,{i})=>t+score(theirs,i),0);lines.push(a===b?`The teams were tied ${a}-${b} at halftime.`:`${a>b?name:event.opponent} led ${Math.max(a,b)}-${Math.min(a,b)} at halftime.`);}
      const quarters=periods.filter(({p})=>/^Q\d$/i.test(p)).map(({p,i})=>({p,d:score(ours,i)-score(theirs,i),us:score(ours,i),them:score(theirs,i)}));
      const best=quarters.reduce((a,b)=>!a||b.d>a.d?b:a,null);
      if(best&&best.d>0)lines.push(`${name} won the ${best.p.slice(1)}${['','st','nd','rd'][Number(best.p.slice(1))]||'th'} quarter ${best.us}-${best.them}.`);
    }
  }
  return{lines,stats};
}
// "On 9/18, the Manhattan varsity football team won their away ... game":
// the school played away. When the sentence names the opponent first, the
// opponent's "away" is the school's home game.
function contestRelation(contest,school){
  // MaxPreps' own home/away type first: the summary names the school as
  // MaxPreps does ("Christ Prep Academy"), not always as the app does.
  if(contest.site)return contest.site==='AWAY'?'at':'vs';
  const m=String(contest.summary||'').match(/^On [\d/]+, the (.+?) varsity .*?\btheir (home|away|neutral)\b/i);
  if(!m||m[2].toLowerCase()==='neutral')return'vs';
  const ours=nameKey(m[1])===nameKey(school.short_name);
  return(m[2].toLowerCase()==='away')===ours?'at':'vs';
}
const ORDINAL=n=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th'}`;
// The school's results at a TennisReporting event on the calendar day: the
// event and host site found by date and school, then both draws.
async function tennisReportingResults(school,team,game){
  const config=team.tennisReporting;if(!config)return null;
  const post=(path,body)=>sourceFetch(TENNIS_REPORTING+path,{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json','accept':'application/json'}},{ttl:SOURCE_TTL.schedule}).then(r=>r.ok?r.json():null).catch(()=>null);
  const get=(path,ttl=SOURCE_TTL.listing)=>sourceFetch(TENNIS_REPORTING+path,{headers:{accept:'application/json'}},{ttl}).then(r=>r.ok?r.json():null).catch(()=>null);
  const list=await sourceFetch(TENNIS_REPORTING+'events',{method:'POST',body:JSON.stringify({page:0,pageSize:200,sorted:[],filtered:{stateId:config.stateId}}),headers:{'content-type':'application/json','accept':'application/json'}},{ttl:SOURCE_TTL.listing}).then(r=>r.ok?r.json():null).catch(()=>null);
  for(const candidate of tennisReportingEvents(list,{stateId:config.stateId,genderId:config.genderId,date:game.date})){
    const event=await get(`event/${candidate.id}`);
    for(const host of tennisHosts(event)){
      const schools=await get(`event/${candidate.id}/host/${host.id}/schools`);
      if(!(schools||[]).some(s=>clean(s.name)===config.school))continue;
      const draws=await Promise.all(['Singles','Doubles'].map(async matchType=>{
        const [bracket,seeds]=await Promise.all([post(`event/${candidate.id}/host/${host.id}/bracket/get`,{matchType,isConsolation:false}),post(`event/${candidate.id}/seed_list_by_params`,{host:host.id,matchType})]);
        return{matchType,bracket,matches:tennisMatches({bracket,seeds,matchType,school:config.school})};
      }));
      const matches=draws.flatMap(d=>d.matches);
      if(!matches.length)return null;
      const name=school.short_name,rows=[],highlights=[];
      const entries=new Map();for(const m of matches){const key=`${m.matchType}|${m.players.join('/')}`;if(!entries.has(key))entries.set(key,[]);entries.get(key).push(m);}
      for(const [key,list] of entries){
        const [matchType]=key.split('|'),players=list[0].players.join(' / '),group=`${matchType}: ${players}${list[0].seed?` (seed ${list[0].seed})`:''}`;
        for(const m of list)rows.push({group,participant:m.round_name,result:m.won==null?`vs ${m.opponents.join(' / ')} (${m.opponent_school}) · not played yet`:`${m.won?'W':'L'} ${m.score} vs ${m.opponents.join(' / ')} (${m.opponent_school})`});
        const last=list.at(-1),wins=list.filter(m=>m.won===true).length;
        const placement=last.placement?`, finished ${ORDINAL(Number(last.placement))||last.placement}`:'';
        highlights.push(`${players} (${matchType.toLowerCase()}) won ${wins} of ${list.filter(m=>m.won!=null).length} matches${last.won===false?`, out in the ${last.round_name.toLowerCase()}`:last.won&&last.round_name==='Final'?', won the final':''}${placement}${last.qualified?' and qualified for state':''}.`);
      }
      const standing=tennisTeamStanding(draws.flatMap(d=>d.bracket?.teamPoints||[]),config.school);
      const scored=standing&&standing.points>0;
      if(scored)rows.unshift({group:'Team',participant:`${name} team`,result:`${ORDINAL(standing.place)}${standing.tied?' (tie)':''} of ${standing.teams} · ${standing.points} pts`});
      // A match between two of the school's own entries is not in its record.
      const played=matches.filter(m=>m.won!=null&&m.opponent_school!==config.school),wins=played.filter(m=>m.won).length;
      return{rows,headline:scored?`${ORDINAL(standing.place)} of ${standing.teams} · ${standing.points} pts`:`Matches ${wins}-${played.length-wins}`,highlights,url:`https://tennisreporting.com/event/brackets/${candidate.id}?host=${host.id}`,label:'View TennisReporting bracket',note:`${candidate.name}, ${host.name}: draws and scores as posted to TennisReporting.`};
    }
  }
  return null;
}
// Cross country results from the timer's MeetPro pages (LetsGoRun Timing):
// the meet whose page carries the calendar day and the school's runners.
// Known meets are listed in the module by day; others are looked up on the
// timer's results list, a few pages at most, ranked by the calendar name.
// A slow timer site must not hold the feed: each read stops after 10 s, and
// one refresh reads each page once (memo).
const MEETPRO_TIMEOUT_MS=10000;
function meetProReader(memo=new Map()){
  return(url,ttl)=>{if(!memo.has(url))memo.set(url,sourceFetch(url,{signal:AbortSignal.timeout(MEETPRO_TIMEOUT_MS)},{ttl}).then(r=>r.ok?r.text():null).catch(()=>null));return memo.get(url);};
}
// On a meet's day (`live`) the timer's pages are read again after a minute
// (track; the page polls the feed every 15 s while a card is live).
const MEETPRO_LIVE_TTL=60;
async function meetProResultsFor(school,module,team,game,read=meetProReader(),live=false){
  const config=module.meetPro,own=team.meetPro;if(!config||!own)return null;
  live=live&&!!own.track;
  const page=folder=>read(`${config.base}${folder}/`,live?MEETPRO_LIVE_TTL:SOURCE_TTL.document);
  let folders=[...(game.meetProFolder?[game.meetProFolder]:[]),...(config.folders?.[game.date]||[])];
  if(!folders.length&&config.listing){
    const listing=await read(config.listing,live?SOURCE_TTL.schedule:SOURCE_TTL.listing)||'';
    const known=new Set(Object.values(config.folders||{}).flat()),words=nameKey(game.name).split(' ').filter(w=>w.length>2&&!/^(?:invite|invitational|meet|home|event|park|state|the)$/.test(w));
    const ranked=meetProLinks(listing).filter(f=>f.startsWith(game.date.slice(0,4)+'_')&&!known.has(f)).map(f=>({f,hits:words.filter(w=>nameKey(f.replace(/_/g,' ')).split(' ').includes(w)).length})).filter(x=>x.hits).sort((a,b)=>b.hits-a.hits).slice(0,3);
    const pages=await Promise.all(ranked.map(({f})=>page(f)));
    ranked.forEach(({f},i)=>{if(pages[i]&&meetProDate(pages[i])===game.date)folders.push(f);});
  }
  for(const folder of folders){
    const html=await page(folder);if(!html)continue;
    if(own.track){const r=await meetProTrackResultsFor(school,config,own,folder,html,read,live);if(r)return r;continue;}
    const races=meetProResults(html,own.team).filter(r=>(!own.races||own.races.test(r.race))&&!(own.exclude&&own.exclude.test(r.race)));
    if(!races.length)continue;
    return{...xcRaceSummary(school,races),url:`${config.base}${folder}/`,label:'View full results (LetsGoRun Timing)',note:'Results as posted by LetsGoRun Timing (MeetPro).'};
  }
  return null;
}
// One school's cross country races at a meet: team place and runners.
function xcRaceSummary(school,races){
  // Meets name races their own way ("7th Boys Two Mile Run 7th Grade Boys",
  // "8th Girls Two MIle", "Girls Varsity"): grade and gender.
  const label=race=>{const grade=(race.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/i)||[])[0],sex=/\b(?:girls?|women'?s?)\b/i.test(race)?'Girls':/\b(?:boys?|men'?s?)\b/i.test(race)?'Boys':'';return[grade&&grade.toLowerCase(),sex].filter(Boolean).join(' ')||race;};
  const group=race=>`${label(race)}${/\bvarsity\b/i.test(race)&&!/junior/i.test(race)?' Varsity':''}`;
  const rows=[],highlights=[],headline=[];
  for(const r of races){
    if(r.team){rows.push({group:group(r.race),participant:`${school.short_name} team`,result:`${ORDINAL(r.team.place)} of ${r.teams}${r.team.score?` · ${r.team.score} pts`:''}`});headline.push(`${label(r.race)} ${ORDINAL(r.team.place)} of ${r.teams}`);}
    for(const runner of r.runners)rows.push({group:group(r.race),participant:`${runner.athlete}${runner.year?` (${runner.year})`:''}`,result:`${ORDINAL(runner.place)} of ${r.field} · ${runner.time}`});
    const top=r.runners[0];
    highlights.push(`${group(r.race)}: ${r.team?`${school.short_name} ${r.team.place===1?'won the team title':`placed ${ORDINAL(r.team.place)} of ${r.teams}`}${r.team.score?` with ${r.team.score} points`:''}; `:''}${top.athlete} led ${school.short_name} in ${ORDINAL(top.place)} (${top.time}).`);
  }
  const runners=races.reduce((n,r)=>n+r.runners.length,0);
  return{rows,headline:headline.join(' · ')||`${runners} runner${runners===1?'':'s'}`,highlights};
}
// Cross country the timer posts to AthleticLIVE (module `meetPro.athleticLive`;
// user, October 28: the Kansas Approved Schools state meet, "Results:
// live.letsgorun.com/meets/79638"). On the meet's day every document is read
// again after a minute: each race's finishers so far and the school's latest.
async function athleticLiveResultsFor(school,meet,game,read,live=false){
  const ttl=live?MEETPRO_LIVE_TTL:SOURCE_TTL.document,doc=path=>read(`${ATHLETIC_LIVE_DOCS}${path}`,ttl).then(text=>{try{return JSON.parse(text)?._source||null}catch{return null}});
  const info=await doc(`live_results_meet_list/_doc/${meet.meet}`);if(!info)return null;
  const docs=await Promise.all((info.xcp||[]).map(async race=>{
    const [results,score,entries]=await Promise.all([doc(`ind_res_list/_doc/${race.i}`),doc(`xc_score_report/_doc/${encodeURIComponent(`xcSR|${race.i}`)}`),live?doc(`ind_ent_list/_doc/${race.i}`):null]);
    return{results,score,entries};
  }));
  const all=athleticLiveXcRaces(info,docs,meet.schools[school.id]).filter(r=>!(meet.exclude&&meet.exclude.test(r.race))),races=all.filter(r=>r.runners.length);
  if(!races.length)return null;
  const out={...xcRaceSummary(school,races),url:`https://live.letsgorun.com/meets/${meet.meet}`,label:'View full results (LetsGoRun Timing)',note:'Results as posted by LetsGoRun Timing (AthleticLIVE).',source_name:'LetsGoRun Timing (AthleticLIVE)'};
  if(!live)return out;
  // "Boys 5000 Meters: 40 of 83 finished · Girls 5000 Meters: not started";
  // the latest are the school's last finishers, the latest race first.
  const sex=race=>/\bgirls?\b/i.test(race)?'Girls':/\bboys?\b/i.test(race)?'Boys':race;
  out.live=true;
  out.live_label=all.map(r=>`${sex(r.race)}: ${r.field?`${r.field}${r.entries?` of ${r.entries}`:''} finished`:'not started'}`).join(' · ');
  out.latest=[...races].sort((a,b)=>String(b.updated||'').localeCompare(String(a.updated||''))).flatMap(r=>[...r.runners].reverse().map(x=>({group:sex(r.race),participant:`${x.athlete}${x.year?` (${x.year})`:''}`,result:`${ORDINAL(x.place)} of ${r.field} · ${x.time}`}))).slice(0,5);
  return out;
}
// Track and field from the same timer (October 25): a meet's index gives the
// team scores and links one page per event (40 to 90 a meet); each event's
// final round gives the school's placers. One refresh reads at most
// MEETPRO_TRACK_PAGES event pages for all of a feed's meets (each page is
// kept 6 h, so later refreshes read none); a meet past that budget shows its
// team scores only.
const MEETPRO_TRACK_PAGES=300;
async function meetProTrackResultsFor(school,config,own,folder,html,read,live=false){
  const index=meetProTrackIndex(html),teams=new Set([].concat(own.team).map(meetProTrackTeam)),isOurs=name=>teams.has(meetProTrackTeam(name));
  const keep=division=>!(own.exclude&&own.exclude.test(division||''));
  // A middle school reads a meet run by grade, never a high school meet.
  if(own.meetHas&&![...index.events,...index.tables].some(e=>own.meetHas.test(e.division||'')))return null;
  const place=(row,rows)=>`${rows.filter(r=>r.place===row.place).length>1?'T':''}${ORDINAL(row.place)}`;
  // An event with no gender ("4X100 Thrower's Relay", listed twice) is not read.
  const events=index.events.filter(e=>e.sex&&keep(e.division));
  read.trackPages??=MEETPRO_TRACK_PAGES;
  const readEvents=events.length<=read.trackPages;
  if(readEvents)read.trackPages-=events.length;
  const ttl=live?MEETPRO_LIVE_TTL:SOURCE_TTL.document;
  const [pages,recent]=await Promise.all([readEvents?Promise.all(events.map(e=>read(`${config.base}${folder}/${e.page}`,ttl))):[],live?read(`${config.base}${folder}/results.json`,ttl).then(meetProTrackRecent):[]]);
  const latest=[];
  const groups=new Map(),group=name=>{if(!groups.has(name))groups.set(name,{team:[],marks:[],wins:[]});return groups.get(name);};
  for(const table of index.tables.filter(t=>keep(t.division))){
    const mine=table.rows.find(r=>isOurs(r.team));
    if(mine)group(table.group).team.push({place:mine.place,shown:place(mine,table.rows),teams:table.rows.length,points:mine.points});
  }
  let athletes=0;
  for(const [i,e] of events.entries()){
    const page=pages[i]&&meetProTrackEvent(pages[i]);if(!page)continue;
    const g=group(meetProTrackGroup(e.sex,e.division)),field=page.rows.length;
    for(const row of page.rows.filter(r=>isOurs(r.team))){
      const who=row.relay?`${e.event}${row.squad&&row.squad!=='A'?` ${row.squad}`:''} (${row.relay.join(', ')})`:`${row.athlete}${row.year?` (${row.year})`:''}`;
      g.marks.push({participant:who,result:`${row.relay?'':`${e.event} · `}${place(row,page.rows)} of ${field}${row.mark?` · ${row.mark}`:''}`});
      if(live)latest.push({page:e.page,group:meetProTrackGroup(e.sex,e.division),...g.marks.at(-1)});
      if(!row.relay)athletes++;
      if(row.place===1)g.wins.push(row.relay?`${e.event}${row.mark?` (${row.mark})`:''}`:`${row.athlete} (${e.event}${row.mark?`, ${row.mark}`:''})`);
    }
  }
  // Grades in order, girls before boys, a class before the whole meet.
  const rank=name=>[Number((name.match(/^(\d+)/)||[])[1]||99),/Girls/.test(name)?0:/Boys/.test(name)?1:2,/^(?:\d+\w*\s+)?(?:Girls|Boys|Mixed)$/.test(name)?1:0];
  const order=[...groups].sort(([a],[b])=>{const x=rank(a),y=rank(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];});
  const rows=[],headline=[],highlights=[];
  for(const [name,g] of order){
    if(!g.team.length&&!g.marks.length)continue;
    for(const t of g.team){rows.push({group:name,participant:`${school.short_name} team`,result:`${t.shown} of ${t.teams}${t.points?` · ${t.points} pts`:''}`});headline.push(`${name} ${t.shown} of ${t.teams}`);}
    rows.push(...g.marks.map(m=>({group:name,...m})));
    const t=g.team[0],team=t?`${school.short_name} ${t.shown==='1st'?'won the team title':`placed ${t.shown} of ${t.teams}`}${t.points?` with ${t.points} points`:''}`:'';
    const wins=g.wins.length?`${g.wins.length===1?'event win':`${g.wins.length} event wins`}: ${g.wins.join('; ')}`:'';
    if(team||wins)highlights.push(`${name}: ${[team,wins].filter(Boolean).join('; ')}.`);
  }
  if(!rows.length)return null;
  const wins=[...groups.values()].reduce((n,g)=>n+g.wins.length,0);
  // Live: the events posted so far, and the school's latest results first
  // (the order heats finished in results.json; the program's order without it).
  const liveFields=live?{live:true,live_label:`${index.events.length} of ${index.scheduled||index.events.length} events posted`,
    latest:latest.map((x,i)=>({...x,rank:recent.indexOf(x.page)<0?recent.length+events.length-i:recent.indexOf(x.page)})).sort((a,b)=>a.rank-b.rank).slice(0,5).map(({group,participant,result})=>({group,participant,result}))}:{};
  return{...liveFields,rows,headline:headline.join(' · ')||`${athletes} athletes${wins?` · ${wins} event win${wins===1?'':'s'}`:''}`,highlights,url:`${config.base}${folder}/`,label:'View full results (LetsGoRun Timing)',
    note:readEvents?'Results as posted by LetsGoRun Timing (MeetPro).':'Team scores as posted by LetsGoRun Timing (MeetPro); event results on the timer\'s page.'};
}
// Golf from Prep.Golf (October 21): the school page lists each tournament's
// place and score; the tournament's page gives the team table and every
// golfer. A tournament is matched to the calendar by day, varsity only, and by
// name when two varsity tournaments share a day.
async function prepGolfResultsFor(school,module,team,game,read=meetProReader()){
  const config=module.prepGolf;if(!config||!team.meet)return null;
  const list=prepGolfTournaments(await read(`${PREP_GOLF}schools/${config.school}`,SOURCE_TTL.listing)||'');
  // KSHSAA renamed golf regionals "sub-state": the calendar's "Regionals" on
  // Oct 12 is Prep.Golf's "6A Sub-State" on Oct 13. A named match may be a
  // day off; any other match is by the day itself.
  const key=name=>nameKey(String(name).replace(/\bsub-?state\b|\bregionals?\b/gi,' postseason ')).split(' ').filter(w=>w.length>3&&!/^(?:varsity|girls|boys|golf|invitational|invite|tournament|2026|2027)$/.test(w));
  const words=key(game.name),dayOf=t=>Date.UTC(2000,t.month-1,t.day),gameDay=Date.UTC(2000,Number(game.date.slice(5,7))-1,Number(game.date.slice(8,10)));
  const varsity=list.filter(t=>t.gender===team.label&&/^varsity$/i.test(t.type)&&t.place);
  const sameDay=varsity.filter(t=>dayOf(t)===gameDay),named=varsity.filter(t=>Math.abs(dayOf(t)-gameDay)<=86400000&&words.some(w=>key(t.name).includes(w)));
  const pick=sameDay.length===1?sameDay[0]:named.length===1?named[0]:null;if(!pick)return null;
  const url=`${PREP_GOLF}tournaments/results/${pick.id}`,{teams,players}=prepGolfResults(await read(url,SOURCE_TTL.document)||'');
  // Two schools Prep.Golf gives one code (Riley County and Rock Creek, "RC")
  // cannot be told apart when both played: the golfers are not listed then.
  const shared=config.sharesCodeWith&&teams.some(t=>nameKey(t.name)===nameKey(config.sharesCodeWith));
  const placed=teams.filter(t=>t.place),own=shared?[]:players.filter(p=>p.school===config.code);
  const field=placed.length?` of ${placed.length}`:'';
  const rows=[{group:`${team.label} Varsity`,participant:`${school.short_name} team`,result:`${pick.place}${field} · ${pick.score}`},
    ...own.map(p=>({group:`${team.label} Varsity`,participant:p.name,result:`${/^\d/.test(p.place||'')?ORDINAL(Number(p.place)):p.place||'–'} · ${p.total}${p.to_par?` (${p.to_par})`:''}${p.rounds.length>1?` · ${p.rounds.join('-')}`:''}${p.qualified?' · Qualified for State':''}`}))];
  const top=own[0],win=/^1st$/i.test(pick.place);
  const highlights=[`${school.short_name} ${win?'won the team title':`placed ${pick.place}${field}`} with ${pick.score}.`,...(top?[`${top.name} led ${school.short_name}${top.place?` in ${/^\d/.test(top.place)?ORDINAL(Number(top.place)):top.place}`:''} with ${top.total}${top.to_par?` (${top.to_par})`:''}${top.place==='1'?', the medalist':''}.`]:[])];
  return{rows,headline:`${pick.place}${field} · ${pick.score}`,highlights,url,label:'View full results (Prep.Golf)',note:'Results as posted on Prep.Golf.'};
}
// Bound: the school's own finals, read once per build and only when a team
// of the sport has a Bound fallback. Bound refuses the full identity (403 for
// a user agent carrying the bot page's address) and answers the scoreboard
// identity (user, October 21: "Go with option 1").
async function boundFinalsFor(school,module,today){
  const config=module.bound;if(!config)return[];
  const url=`${BOUND_API}${config.school}/scores?startDate=${today.slice(0,4)-(today.slice(5,7)<'07'?1:0)}-07-01&endDate=${today}&includePractices=false&pageSize=500&ticket=false`;
  try{const r=await sourceFetch(url,{headers:{'User-Agent':SCOREBOARD_USER_AGENT,'Accept':'application/json'}},{ttl:SOURCE_TTL.listing,staleOnError:true});if(!r.ok)return[];return boundFinals(JSON.parse(await r.text()),{school:config.school,timeZone:schoolTimeZone(school)})}catch{return[]}
}
// A meet's team places from Bound (cross country, golf) when the timer's
// pages and Prep.Golf have none.
function boundMeetResults(school,module,team,finals,date){
  const rows=[],headline=[],highlights=[];
  for(const [label,act] of Object.entries(team.boundMeet.acts)){
    const m=boundMeet(finals,{act,date,lowWins:team.boundMeet.lowWins});if(!m)continue;
    const place=`${m.tied?'T':''}${ORDINAL(m.place)}`;
    rows.push({group:`${label} Varsity`,participant:`${school.short_name} team`,result:`${place} of ${m.teams} · ${m.score} ${team.boundMeet.unit}`});
    headline.push(`${label} ${place} of ${m.teams}`);
    highlights.push(`${label} Varsity: ${school.short_name} ${m.place===1&&!m.tied?'won the team title':`placed ${place} of ${m.teams}`} with ${m.score} ${team.boundMeet.unit}.`);
  }
  return rows.length?{rows,headline:headline.join(' · '),highlights,url:module.bound.page,label:'View on Bound',note:'Team scores as entered on Bound by the school.'}:null;
}
// A school whose schedule is on Bound (src/high-school.mjs, October 25): each
// act of the sport read once (kept ten minutes; a failed read serves the last
// copy), with the scoreboard identity Bound answers (user, October 21).
async function boundSchedulePayloads(module,acts,year){
  const urls=[...new Set(acts.flatMap(act=>(BOUND_ACTS[act]||[]).map(id=>boundEventsUrl(module.bound.school,{start:year.start,end:year.end,act:id}))))];
  const payloads=await Promise.all(urls.map(async url=>{try{const r=await sourceFetch(url,{headers:{'User-Agent':SCOREBOARD_USER_AGENT,'Accept':'application/json'}},{ttl:SOURCE_TTL.listing,staleOnError:true});if(!r.ok)return null;return JSON.parse(await r.text())}catch{return null}}));
  return{urls,payloads,failed:payloads.some(p=>!Array.isArray(p))};
}
// A Bound meet's team place from the scores entered on it (golf strokes,
// cross country points): low wins.
function boundEntryResults(school,module,team,game){
  const unit=/golf/i.test(game.act)?'strokes':/cross country/i.test(game.act)?'pts':null;if(!unit)return null;
  const m=boundTeamPlace(game,{lowWins:true});if(!m)return null;
  const place=`${m.tied?'T':''}${ORDINAL(m.place)}`,group=`${team.label?`${team.label} `:''}${/^varsity$/i.test(game.level)?'Varsity':game.level}`;
  return{rows:[{group,participant:`${school.short_name} team`,result:`${place} of ${m.teams}${m.score?` · ${m.score} ${unit}`:''}`}],headline:`${place} of ${m.teams}`,highlights:[`${group}: ${school.short_name} ${m.place===1&&!m.tied?'won the team title':`placed ${place} of ${m.teams}`}${m.score?` with ${m.score} ${unit}`:''}.`],url:module.bound.page,label:'View on Bound',note:'Team scores as entered on Bound by the schools.'};
}
async function fetchHighSchool(school,sport,now,aiTargetId=null){
  const module=highSchoolModule(school.id),teams=module?.sports[sport];
  if(!teams)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'Sport not built for this school'};
  const year=highSchoolYear(now,school),calendarUrl=module.calendar?`${module.calendar.url}${module.calendar.url.includes('?')?'&':'?'}start_date=${year.start}&end_date=${year.end}`:null;
  let payload=null;
  if(calendarUrl){
    // A failed read serves the last copy read (up to a day old): the school's
    // site answers Cloudflare with an intermittent 520, which blanked 3 of 8
    // forced refreshes of Manhattan football and volleyball (Oct 16).
    const calendarResponse=await sourceFetch(calendarUrl,{},{ttl:SOURCE_TTL.schedule,staleOnError:true});
    if(!calendarResponse.ok)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:`${calendarUrl}: HTTP ${calendarResponse.status}`};
    // A schedule kept as a sheet (Flint Hills Christian) is read by its module.
    try{const text=await calendarResponse.text();payload=module.calendar.read?module.calendar.read(text):JSON.parse(text)}catch{}
    if(!payload)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:`${calendarUrl}: not a calendar`};
  }
  // A school that keeps its schedule only on MaxPreps (Christ Prep, Veritas
  // Christian, Kickapoo Nation, Metro Academy: no calendar, not on Bound).
  const maxprepsOnly=!module.calendar&&!module.bound;
  const timeZone=schoolTimeZone(school),sourceUrl=calendarUrl?calendarUrl.split('?')[0]:maxprepsOnly?module.maxpreps.base:module.bound.page,sourceName=calendarUrl?'Official school calendar':maxprepsOnly?'MaxPreps (team schedule)':'Bound (school schedule)';
  const sources=calendarUrl?[calendarUrl]:[],events=[],today=new Date(schoolToday(now,school)).toISOString().slice(0,10);
  // Every team's Bound acts at once.
  const boundActs=[...new Set(teams.flatMap(team=>team.boundSchedule?.acts||[]))];
  const boundRead=boundActs.length?await boundSchedulePayloads(module,boundActs,year):null;
  // A second calendar for coming dates only (Onaga's district calendar on
  // Apptegy lists games its Bound page does not): pages of 100 to its end.
  let upcomingPayload=null;
  if(module.upcoming&&teams.some(team=>team.upcoming)){
    const pages=[];
    for(let page=1;page<=(module.upcoming.pages||3);page++){
      // Apptegy pages by `page_size` (`per_page` is ignored: 20 a page).
      const url=`${module.upcoming.url}?page_no=${page}&page_size=100`;
      try{const r=await sourceFetch(url,{headers:{'Accept':'application/json'}},{ttl:SOURCE_TTL.listing,staleOnError:true});if(!r.ok)break;const json=JSON.parse(await r.text()),list=json.events||[];pages.push(json);sources.push(url);if(list.length<100||String(list.at(-1)?.start_at||'').slice(0,10)>year.end)break;}catch{break}
    }
    upcomingPayload=apptegyCalendar(pages);
  }
  if(boundRead){if(boundRead.payloads.every(p=>!Array.isArray(p)))return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:`${boundRead.urls[0]}: unreadable`};sources.push(...boundRead.urls);}
  // A failed MaxPreps read leaves every past game without its score (and so
  // unlisted): the build is marked, and the feed keeps its last good copy.
  let scoresMissing=false;
  for(const team of teams){
    const games=team.boundSchedule?boundDedupe(boundSchedule(boundRead.payloads,{school:module.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone,noun:team.meet?'Meet':'Tournament'}),{meet:!!team.meet}).filter(game=>!module.skip?.test(game.name)):maxprepsOnly?[]:calendarEvents(payload,{prefix:module.calendar.prefix,team:team.calendar,parse:module.calendar.parse,timeZone}).filter(game=>!module.skip?.test(game.name));
    if(team.upcoming&&upcomingPayload){
      const extra=calendarEvents(upcomingPayload,{team:team.upcoming,parse:module.upcoming.parse,timeZone}).filter(g=>g.date>=today&&!games.some(x=>x.date===g.date&&(team.meet||!x.h2h&&x.h2h!=null||namesCompatible(x.name,g.name))));
      if(extra.length){games.push(...extra);games.sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));}
    }
    // A trial meet the timer runs to test the live reader (module
    // `meetPro.trials`: date, folder, name, schools) joins its schools' track
    // schedule for that day.
    if(team.meetPro?.track)for(const trial of module.meetPro?.trials||[]){
      if(!trial.schools?.includes(school.id)||!trial.date||games.some(g=>g.date===trial.date&&g.meetProFolder===trial.folder))continue;
      games.push({date:trial.date,time:trial.time||null,end_date:null,name:trial.name,site:trial.site||'AWAY',meetProFolder:trial.folder,calendar_id:`trial|${trial.folder}`});
      games.sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
    }
    // A meet the timer posts to AthleticLIVE (module `meetPro.athleticLive`)
    // joins the school's meet that day, or is added when its schedule (St.
    // Mary's Academy's Bound page) leaves it out.
    if(team.meetPro&&!team.meetPro.track)for(const meet of module.meetPro?.athleticLive||[]){
      if(meet.sport!==sport||!meet.schools?.[school.id])continue;
      const day=games.find(g=>g.date===meet.date);
      // The meet's start (user: "Saturday, Oct. 31, 9:45 a.m.") over the sheet's 10:00.
      if(day){day.athleticLive=meet;if(meet.time)day.time=meet.time;continue;}
      games.push({date:meet.date,time:meet.time||null,end_date:null,name:meet.name,site:meet.site||'AWAY',athleticLive:meet,calendar_id:`athleticlive|${meet.meet}`});
      games.sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
    }
    let contests=[];
    if(team.maxpreps){
      const url=`${module.maxpreps.base}${team.maxpreps}/schedule/`;
      // Only a team with past games needs its scores (Oct 21: the girls'
      // soccer page, a spring season with no games yet, failed every read,
      // so Manhattan soccer was never saved as a good copy).
      const needsScores=maxprepsOnly||games.some(game=>game.date<today);
      try{const r=await sourceFetch(url,{},{ttl:SOURCE_TTL.schedule,staleOnError:true});if(r.ok){contests=maxprepsContests(await r.text(),module.maxpreps.schoolId).filter(c=>c.date>=year.start&&c.date<=year.end);sources.push(url);}else if(needsScores)scoresMissing=true}catch{if(needsScores)scoresMissing=true}
    }
    const label=team.label||null,used=new Set();
    // Volleyball: MaxPreps lists each match of a tournament or triangular;
    // the calendar names only the day. Matches come from MaxPreps, coming
    // days from the calendar.
    // A game sport on Bound reads the same way: MaxPreps' finals, then the
    // finals the schools entered on Bound that MaxPreps lacks, then the coming
    // games and tournament days from Bound.
    if(team.matches||(team.boundSchedule&&!team.meet)){
      // 0-0 ties are a tournament's pool placeholders on MaxPreps, not matches.
      const finals=contests.filter(c=>c.result&&c.opponent&&c.score!=null&&c.opponent_score!=null&&c.score+c.opponent_score>0);
      for(const c of finals){
        const event=highSchoolEvent({school,sport,team:label,date:c.date,time:c.time,opponent:c.opponent,relation:contestRelation(c,school),named:false,contest:c,sourceUrl:c.game_url||`${module.maxpreps.base}${team.maxpreps}/schedule/`,sourceName,now});
        if(event)events.push(event);
      }
      const inMaxPreps=game=>finals.some(c=>c.date===game.date&&namesCompatible(c.opponent,game.name));
      // "Tournament at Wakefield" names its place: "Blue Valley · Tournament at Wakefield".
      const gameRelation=game=>game.h2h===false||(game.h2h==null&&isNamedEvent(game.name))?(game.site==='HOME'||/\bat\s/.test(game.name)?'·':'at'):game.site==='AWAY'?'at':'vs';
      for(const game of games.filter(g=>g.final&&g.date<=today&&!inMaxPreps(g))){
        const event=highSchoolEvent({school,sport,team:label,date:game.date,time:game.time,opponent:game.name,relation:gameRelation(game),named:false,contest:{...game.final,opponent:game.name,source:'bound',game_url:null,source_url:module.bound.page},sourceUrl,sourceName,now});
        if(event)events.push(event);
      }
      // Played with no score anywhere (a game MaxPreps and Bound lack; a
      // tournament day with no match posted): "No score posted".
      const finalDays=new Set(finals.map(c=>c.date));
      for(const game of games.filter(g=>g.date<today&&!g.final&&!inMaxPreps(g)&&(g.h2h||!finalDays.has(g.date)))){
        const event=highSchoolEvent({school,sport,team:label,date:game.date,time:game.time,endDate:game.end_date,opponent:game.name,relation:gameRelation(game),named:true,sourceUrl,sourceName,placeholder:game.teams?.length===1,now});
        if(event)events.push(event);
      }
      for(const game of games.filter(g=>g.date>=today&&!g.final&&!inMaxPreps(g))){
        const event=highSchoolEvent({school,sport,team:label,date:game.date,time:game.time,endDate:game.end_date,opponent:game.name,relation:gameRelation(game),named:true,sourceUrl,sourceName,now});
        if(event)events.push(event);
      }
      continue;
    }
    // Results for every past game at once (each source read in parallel).
    const bound=team.bound||team.boundMeet?await boundFinalsFor(school,module,new Date(today).toISOString().slice(0,10)):[];
    const read=meetProReader(),gameResults=await Promise.all(games.map(game=>game.date>today?null:team.tennisReporting?tennisReportingResults(school,team,game):game.athleticLive?athleticLiveResultsFor(school,game.athleticLive,game,read,(game.end_date||game.date)>=today).then(r=>r||meetProResultsFor(school,module,team,game,read)):team.meetPro?meetProResultsFor(school,module,team,game,read,(game.end_date||game.date)>=today):sport==='Golf'?prepGolfResultsFor(school,module,team,game,read):null));
    for(const [index,game] of games.entries()){
      const named=team.meet||isNamedEvent(game.name)||/\btbd\b/i.test(game.name);
      let contest=named?null:matchContest(game,contests,used);
      if(contest)used.add(contest);
      // MaxPreps has no score for a past game: the school's own final on Bound.
      if(!named&&team.bound&&game.date<=new Date(today).toISOString().slice(0,10)&&!(contest?.result&&contest.score!=null)){
        const own=boundGame(bound,{acts:team.bound,date:game.date,opponent:game.name,compatible:namesCompatible});
        if(own)contest={...own,source:'bound',game_url:null,source_url:module.bound.page};
      }
      // MaxPreps names the opponent when the calendar names the host of a
      // tournament day ("Blue Valley West" for a game against Blue Valley
      // Northwest there).
      const opponent=contest?.opponent&&!namesCompatible(game.name,contest.opponent)?contest.opponent:game.name;
      // A meet or tournament the school hosts reads "Manhattan · Manhattan Invite".
      // A dual on Bound names the opponent: "Rock Creek vs Abilene".
      const relation=game.h2h?(game.site==='AWAY'?'at':'vs'):named?(game.site==='HOME'||/\bat\s/.test(game.name)?'·':'at'):game.site==='AWAY'?'at':game.site==='HOME'?'vs':contest?contestRelation(contest,school):'vs';
      const results=gameResults[index]||(team.boundMeet&&game.date<new Date(today).toISOString().slice(0,10)?boundMeetResults(school,module,team,bound,game.date):null)||(game.teams&&game.date<today?boundEntryResults(school,module,team,game):null);
      const event=highSchoolEvent({school,sport,team:label,date:game.date,time:game.time||contest?.time||null,endDate:game.end_date,opponent,relation,named,contest,results,sourceUrl,sourceName,placeholder:game.teams?.length===1&&eventType(sport)==='GAME',now});
      if(event)events.push(event);
    }
    // A MaxPreps-only school: its games without a score are its schedule
    // (coming games; past ones read "No score posted"). A contest with no
    // opponent is a tournament's unfilled slot.
    if(maxprepsOnly)for(const contest of contests.filter(c=>!used.has(c)&&c.opponent&&!(c.result&&c.score!=null))){
      used.add(contest);
      const event=highSchoolEvent({school,sport,team:label,date:contest.date,time:contest.time,opponent:contest.opponent,relation:contestRelation(contest,school),named:true,sourceUrl:`${module.maxpreps.base}${team.maxpreps}/schedule/`,sourceName,now});
      if(event)events.push(event);
    }
    // A scored game the calendar does not list (a playoff game added after
    // the calendar was printed) is shown from MaxPreps alone.
    for(const contest of contests.filter(c=>!used.has(c)&&c.result&&c.opponent&&c.score!=null)){
      const event=highSchoolEvent({school,sport,team:label,date:contest.date,time:contest.time,opponent:contest.opponent,relation:contestRelation(contest,school),named:false,contest,sourceUrl:contest.game_url||`${module.maxpreps.base}${team.maxpreps}/schedule/`,now});
      if(!event)continue;
      // Its calendar game (matched to another contest of the day, or with
      // the time moved) then reads as played without a score: it is this one.
      const twin=events.findIndex(e=>e.no_result_posted&&e.sport===sport&&(e.team_label||null)===label&&e.start_time.slice(0,10)===contest.date&&namesCompatible(e.opponent,contest.opponent));
      if(twin>=0)events.splice(twin,1);
      events.push(event);
    }
  }
  const target=aiTargetId&&events.find(e=>e.id===aiTargetId);
  if(target&&target.status==='Final'&&target.school_score!=null){
    let box=null;
    if(target.maxpreps_url){try{const r=await sourceFetch(target.maxpreps_url,{},{ttl:SOURCE_TTL.article});if(r.ok)box=maxprepsBoxScore(await r.text());}catch{}}
    const {lines,stats}=highSchoolHighlights(target,box);
    target.highlights=lines;target.highlights_verified=true;
    if(stats.length)target.game_stats=stats;
    target.highlight_status=target.score_source?.bound?'Score as entered on Bound by the school.':box?'Score and box score as reported to MaxPreps by the team.':'Score as reported to MaxPreps by the team.';
  }
  return{events,source_url:calendarUrl,source_urls:sources,fetched_at:now.toISOString(),live_source_used:true,error:null,scores_missing:scoresMissing};
}
// Professional teams and series (src/pro-sports.mjs): NFL, MLS and MLB teams
// from ESPN's team schedule, NASCAR races from NASCAR's own feeds.
// ESPN reads carry the scoreboard identity (ESPN refuses a user agent with a
// web address; see SCOREBOARD_USER_AGENT).
// A refused or failed read serves the last copy read (a burst of ESPN refusals
// blanked the Chiefs for 28 of 36 preview refreshes, Oct 15).
// Jolpica answers 406 to the HTML Accept header school pages are read with.
async function readJson(url,ttl){try{const init=url.startsWith(ESPN_SITE)?{headers:{'User-Agent':SCOREBOARD_USER_AGENT,'Accept':'application/json'}}:url.startsWith(JOLPICA_F1)?{headers:{'Accept':'application/json'}}:{};const r=await sourceFetch(url,init,{ttl,staleOnError:true});if(!r.ok)return null;return JSON.parse(await r.text())}catch{return null}}
async function fetchPro(school,sport,now,aiTargetId=null){
  const config=proTeam(school.id),timeZone=schoolTimeZone(school);
  const failed=error=>({events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error});
  if(!config||config.sport!==sport)return failed('Sport not built for this team');
  if(config.kind==='espn-team'){
    // MLS: the URL takes ESPN's numeric team id, and the schedule lists results
    // only: coming games are a second read (`?fixture=true`, playoffs included).
    const base=`${ESPN_SITE}${config.espn.path}/teams/${config.espn.id??config.espn.team}/schedule`,urls=[base];
    if(config.fixtures)urls.push(`${base}?fixture=true`);
    // The NFL postseason is read only in its months (January and February).
    const month=schoolNow(now,school).getUTCMonth()+1;if(config.sport==='Football'&&month<=2)urls.push(`${base}?seasontype=3`);
    // MLB: the plain list is the current season type (spring training, then
    // the regular season, then the postseason), so the regular season is read
    // by name, and the postseason in its months (September to November).
    // After the regular season ends its list is kept six hours.
    const ttl=url=>config.sport==='Baseball'&&url.endsWith('seasontype=2')&&(month>=10||month<=2)?SOURCE_TTL.document:SOURCE_TTL.schedule;
    if(config.sport==='Baseball'){urls[0]=`${base}?seasontype=2`;if(month>=9&&month<=11)urls.push(`${base}?seasontype=3`);}
    const payloads=await Promise.all(urls.map(url=>readJson(url,ttl(url))));
    if(!payloads[0])return failed(`${base}: unreadable`);
    const events=espnTeamGames(payloads.filter(Boolean),{school,config,timeZone,now});
    // A game under way (or past its kickoff and not yet final on the team
    // schedule) takes the league scoreboard and its game summary: the live
    // card shows everything ESPN publishes (user, October 16: "update all live
    // cards to show all the data"). Read only on game day, once per 15 s for
    // the whole league (shared cache), keeping ESPN volume low.
    for(const event of events.filter(e=>(e.status==='Live'||e.status==='Today')&&Date.parse(e.espn_date)<=now.getTime())){
      const day=wallClock(event.espn_date,'America/New_York').slice(0,10).replaceAll('-','');
      const board=`${ESPN_SITE}${config.espn.path}/scoreboard?dates=${day}`,game=`${ESPN_SITE}${config.espn.path}/summary?event=${event.espn_event_id}`;
      const [scoreboard,summary]=await Promise.all([readJson(board,15),readJson(game,30)]);
      if(scoreboard){applyEspnLive(event,scoreboard,summary,config);urls.push(board);if(summary)urls.push(game);}
    }
    const target=aiTargetId&&events.find(e=>e.id===aiTargetId);
    if(target&&target.status==='Final'&&target.espn_event_id){
      const summary=await readJson(`${ESPN_SITE}${config.espn.path}/summary?event=${target.espn_event_id}`,SOURCE_TTL.document);
      const details=summary&&espnGameHighlights(target,summary,config);
      if(details){
        target.highlights=details.lines;target.highlights_verified=true;
        // The expanded view lays these out as tables (user, October 16: "can we
        // clean up the card please"): score by quarter, team stats and the
        // scoring plays by quarter; the results keep the short rows only.
        target.box_score=details.box_score;
        target.result_count=target.results.length;
        if(details.recap){target.recap_url=details.recap;target.recap_label='View ESPN recap';}
        target.highlight_status=config.sport==='Soccer'?'Score by half, goals and team stats from ESPN\'s match summary.':config.sport==='Baseball'?'Line score, pitchers of record, team stats and scoring plays from ESPN\'s game summary.':'Line score, team stats and leaders from ESPN\'s game summary.';
      }
    }
    return{events,source_url:base,source_urls:urls,fetched_at:now.toISOString(),live_source_used:true,error:null};
  }
  if(config.kind==='nascar'){
    const year=schoolNow(now,school).getUTCFullYear(),listUrl=`${NASCAR_FEEDS}cacher/${year}/${config.seriesId}/race_list_basic.json`,pointsUrl=`${NASCAR_FEEDS}cacher/${year}/${config.seriesId}/racinginsights-points-feed.json`;
    const [list,points]=await Promise.all([readJson(listUrl,SOURCE_TTL.listing),readJson(pointsUrl,SOURCE_TTL.listing)]);
    // An empty list is a failed read (the season has races): the last good copy
    // is served instead of a blank page (4.97.0 preview, first reads after a deploy).
    if(!Array.isArray(list)||!list.some(r=>r.series_id===config.seriesId))return failed(`${listUrl}: unreadable or empty`);
    const sources=[listUrl,pointsUrl],weekend=id=>`${NASCAR_FEEDS}cacher/${year}/${config.seriesId}/${id}/weekend-feed.json`;
    // A winner missing from the standings (a part-time driver) is named from
    // that race's own results.
    let drivers=nascarDrivers(points);
    const unnamed=list.filter(r=>r.series_id===config.seriesId&&r.winner_driver_id&&!drivers.has(r.winner_driver_id));
    if(unnamed.length){const feeds=await Promise.all(unnamed.slice(0,6).map(r=>readJson(weekend(r.race_id),SOURCE_TTL.document)));drivers=nascarDrivers(points,feeds.filter(Boolean));}
    // Live timing is read only on a race day.
    const today=new Date(schoolToday(now,school)).toISOString().slice(0,10);
    let live=null;
    if(list.some(r=>r.series_id===config.seriesId&&!r.winner_driver_id&&String(r.date_scheduled).slice(0,10)===today)){const url=`${NASCAR_FEEDS}live/feeds/live-feed.json`;live=await readJson(url,30);if(live)sources.push(url);}
    // Every final's results (kept six hours: a finished race does not change).
    const finals=list.filter(r=>r.series_id===config.seriesId&&r.winner_driver_id);
    const feeds=new Map(await Promise.all(finals.map(async r=>[r.race_id,await readJson(weekend(r.race_id),SOURCE_TTL.document)])));
    const finishes=new Map([...feeds].map(([id,feed])=>[id,nascarFinishRows(feed)]).filter(([,rows])=>rows.length));
    // The card's top three as table rows, the race window's layout.
    const tables=new Map([...feeds].map(([id,feed])=>[id,nascarFinishTable(feed)]).filter(([,rows])=>rows.length));
    const events=nascarRaces(list,{school,config,timeZone,now,drivers,live,finishes,tables});
    const target=aiTargetId&&events.find(e=>e.id===aiTargetId);
    if(target&&target.status==='Final'){
      const url=weekend(target.race_id),details=nascarRaceDetails(target,await readJson(url,SOURCE_TTL.document));
      if(details){
        target.results=details.rows;target.result_count=details.rows.length;
        target.race_table=details.table;
        target.highlights=details.lines;target.highlights_verified=true;target.game_stats=details.stats;
        target.highlight_status='Finishing order and race numbers from NASCAR\'s official results feed.';
      }
    }
    return{events,source_url:listUrl,source_urls:sources,fetched_at:now.toISOString(),live_source_used:true,error:null};
  }
  if(config.kind==='imsa')return fetchImsa(school,config,now,timeZone,aiTargetId,failed);
  if(config.kind==='f1')return fetchF1(school,config,now,timeZone,aiTargetId,failed);
  return failed('Unknown pro source');
}
// Formula 1 (src/pro-sports.mjs): the calendar from Jolpica, the season's
// winners and links from formula1.com, and each race's and sprint's official
// classification (kept six hours: a finished race does not change). A race
// formula1.com has not listed yet takes Jolpica's results; one under way
// reads ESPN's F1 board every 30 s.
async function fetchF1(school,config,now,timeZone,aiTargetId,failed){
  const year=schoolNow(now,school).getUTCFullYear(),calendarUrl=`${JOLPICA_F1}${year}.json`,seasonUrl=`${F1_RESULTS}${year}/races`;
  const [calendarPayload,seasonHtml]=await Promise.all([readJson(calendarUrl,SOURCE_TTL.listing),readText(seasonUrl,SOURCE_TTL.listing)]);
  const calendar=f1Calendar(calendarPayload);
  if(!calendar.length)return failed(`${calendarUrl}: unreadable or empty`);
  const season=f1SeasonResults(seasonHtml,year),sources=[calendarUrl,seasonUrl],nowMs=now.getTime();
  const results=new Map(),origins=new Map(),pages=new Map();
  await Promise.all(calendar.flatMap(round=>[false,true].map(async sprint=>{
    const at=sprint?round.sprint:round.start;if(!at||Date.parse(at)>nowMs)return;
    const key=`${round.round}|${sprint?'sprint':'gp'}`,row=f1SeasonRow(season,round);
    if(row?.href){
      const url=`${row.href}${sprint?'sprint-results':'race-result'}`,rows=f1Classification(await readText(url,SOURCE_TTL.document));
      if(rows.length){results.set(key,rows);origins.set(key,{name:'Formula 1 official results (formula1.com)',url});pages.set(key,row.href);return;}
    }
    // Not on formula1.com yet (its first hours, or a sprint before Sunday's
    // race): Jolpica's results, read only in the week after the start.
    if(nowMs-Date.parse(at)>7*864e5&&!row?.href)return;
    const url=`${JOLPICA_F1}${year}/${round.round}/${sprint?'sprint':'results'}.json`,rows=f1JolpicaClassification(await readJson(url,row?.href?SOURCE_TTL.document:SOURCE_TTL.schedule));
    if(rows.length){results.set(key,rows);origins.set(key,{name:'Jolpica F1 database (until formula1.com lists the race)',url});}
  })));
  // A race or sprint under way: ESPN's board for its day (Eastern), with each
  // driver's team and number from the latest classification.
  const live=new Map(),latest=[...results.entries()].sort((a,b)=>parseInt(b[0])-parseInt(a[0]))[0]?.[1]||[];
  const drivers=new Map(latest.map(r=>[r.driver,r]));
  for(const round of calendar)for(const sprint of [false,true]){
    const at=sprint?round.sprint:round.start,key=`${round.round}|${sprint?'sprint':'gp'}`;
    if(!at||results.has(key)||Date.parse(at)>nowMs||nowMs-Date.parse(at)>4*3600e3)continue;
    const board=`${ESPN_SITE}racing/f1/scoreboard?dates=${wallClock(at,'America/New_York').slice(0,10).replaceAll('-','')}`;
    const details=f1LiveDetails(await readJson(board,30),{sprint,start:at,drivers});
    if(details){live.set(key,details);sources.push(board);}
  }
  const events=f1Races(calendar,{school,config,timeZone,now,results,live,sources:origins});
  const target=aiTargetId&&events.find(e=>e.id===aiTargetId);
  if(target&&target.status==='Final'){
    const key=`${target.f1_round}|${target.sprint?'sprint':'gp'}`,base=pages.get(key);
    // The Grand Prix's starting grid and fastest laps (formula1.com).
    const [grid,fastest]=base&&!target.sprint?await Promise.all(['starting-grid','fastest-laps'].map(async page=>f1DriverTable(await readText(`${base}${page}`,SOURCE_TTL.document)))):[[],[]];
    const details=f1RaceDetails(target,results.get(key),{grid,fastest});
    if(details){
      target.results=details.rows;target.result_count=details.rows.length;
      target.race_table=details.table;
      target.highlights=details.lines;target.highlights_verified=true;target.game_stats=details.stats;
      target.highlight_status=`Classification${grid.length?', starting grid and fastest laps':''} from ${origins.get(key)?.name||'Formula 1 official results'}.`;
    }
  }
  return{events,source_url:seasonUrl,source_urls:sources,fetched_at:now.toISOString(),live_source_used:true,error:null};
}
// IMSA's results folders (src/pro-sports.mjs): the season's events, each
// championship's race sessions, and each race's classification. Folders of
// weekends more than a week old are kept six hours (they no longer change);
// a race weekend's are read every 2 minutes.
async function readText(url,ttl){try{const r=await sourceFetch(url,{},{ttl,staleOnError:true});if(!r.ok)return r.status===404?'':null;return await r.text()}catch{return null}}
const readResults=async(url,ttl)=>{const text=await readText(url,ttl);if(!text)return null;try{return JSON.parse(text.replace(/^\uFEFF/,''))}catch{return null}};
async function fetchImsa(school,config,now,timeZone,aiTargetId,failed){
  const year=schoolNow(now,school).getUTCFullYear(),seasonUrl=`${IMSA_RESULTS}${String(year).slice(2)}_${year}/`;
  const listing=await readText(seasonUrl,SOURCE_TTL.listing);
  // No folder yet for a new season (before its first weekend) is an empty
  // season, not a failed read.
  if(listing==null)return failed(`${seasonUrl}: unreadable`);
  const sources=[seasonUrl],settled=modified=>{const t=Date.parse(String(modified).replace(' ','T')+':00Z');return Number.isFinite(t)&&now.getTime()-t>8*864e5};
  const races=(await Promise.all(imsaListing(listing).filter(e=>e.dir).map(async ev=>{
    const ttl=settled(ev.modified)?SOURCE_TTL.document:SOURCE_TTL.schedule,eventUrl=`${seasonUrl}${ev.href}`;
    const series=imsaListing(await readText(eventUrl,ttl)).find(e=>e.dir&&e.name.replace(/^\d+_/,'')===config.championship);
    if(!series)return[];
    const seriesUrl=`${eventUrl}${series.href}`,track=imsaTrack(ev.name);
    return Promise.all(imsaRaceSessions(imsaListing(await readText(seriesUrl,ttl))).map(async session=>{
      const raceUrl=`${seriesUrl}${session.href}`,files=imsaListing(await readText(raceUrl,ttl));
      // An endurance race keeps its classification in its last hour folder,
      // and hourly standings in each.
      let folder=raceUrl,entries=files,hour=null;
      const hours=imsaHourFolders(files);
      if(!imsaResultsFile(files)&&hours.length){folder=`${raceUrl}${hours[0].href}`;entries=imsaListing(await readText(folder,ttl));}
      const file=imsaResultsFile(entries),final=file&&/^03_Results_Race_Official/.test(file.name);
      const results=file?await readResults(`${folder}${file.href}`,final?SOURCE_TTL.document:SOURCE_TTL.schedule):null;
      if(!results&&hours.length){const standings=entries.find(e=>/^04_Results by Hour_Race_.*\.JSON$/i.test(e.name));if(standings)hour=await readResults(`${folder}${standings.href}`,SOURCE_TTL.schedule);}
      return{session:session.name,event:ev.name.replace(/^\d+_/,''),track,results,hour,path:file?`${folder}${file.href}`:null};
    }));
  }))).flat();
  const events=imsaRaces(races,{school,config,timeZone,now,calendar:IMSA_CALENDARS[config.calendar]||[]});
  const target=aiTargetId&&events.find(e=>e.id===aiTargetId);
  if(target&&target.status==='Final'&&target.imsa_path){
    const details=imsaRaceDetails(await readResults(target.imsa_path,SOURCE_TTL.document));
    if(details){
      target.results=details.rows;target.result_count=details.rows.length;
      target.race_table=details.table;delete target.race_card;
      target.highlights=details.lines;target.highlights_verified=true;target.game_stats=details.stats;
      target.highlight_status='Finishing order by class and race numbers from IMSA\'s official results.';
    }
  }
  return{events,source_url:seasonUrl,source_urls:sources,fetched_at:now.toISOString(),live_source_used:true,error:null};
}
function parseLabel(label,school,sport,sourceUrl,now){const s=clean(label);if(!s)return null;let m=s.match(/^Upcoming Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:\s+at\s+(.+?))?$/i);if(m)return fromMatch('Upcoming','upcoming',m);m=s.match(/^Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*(?:(Win|Loss|Tie|Draw)?\s*,?\s*)?(\d+(?:\.\d+)?)?\s*,?\s*(?:to|-)?\s*,?\s*(\d+(?:\.\d+)?)?\s*$/i);if(m)return fromMatch('Final','score',m);m=s.match(/^Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*,\s*(.+?)\s*$/i);if(m)return fromMatch('Final','meet',m);m=s.match(/^Live Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)(?:\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}))?\s*$/i);if(m)return fromMatch('Live','live',m);return null;function fromMatch(status,kind,x){const parsedSport=clean(x[1])||sport;if(!sportMatches(sport,parsedSport))return null;const opponent=clean(x[3]);if(!opponent||/\b(?:vs\.?|versus)\b/i.test(opponent))return null;return makeEvent({school,sport,status,relation:clean(x[2])||'vs',opponent,date:clean(x[4]),time:kind==='upcoming'?clean(x[5]):null,schoolScore:kind==='score'?clean(x[6]):null,oppScore:kind==='score'?clean(x[7]):null,resultText:kind==='meet'?clean(x[5]):null,sourceUrl,now});}}
function extractEventLabels(raw){
  const decoded=decodeHtml(raw),out=[],seen=new Set();
  const add=x=>{x=clean(x);if(x&&!seen.has(x)){seen.add(x);out.push(x);}};
  const attrRe=/(?:aria-label|title)\s*=\s*["']([^"']*(?:Upcoming|Completed|Live) Event:[^"']*)["']/gi;
  let m;
  while((m=attrRe.exec(decoded)))add(m[1]);

  // Some SIDEARM result headings are rendered as element text instead of attributes.
  // Read every event heading independently so one neutral-site result cannot consume
  // or hide the following K-State result.
  const headingRe=/<h[1-6]\b[^>]*>([\s\S]*?(?:Upcoming|Completed|Live) Event:[\s\S]*?)<\/h[1-6]>/gi;
  while((m=headingRe.exec(raw)))add(visibleText(m[1]));

  // SIDEARM does not always expose completed results in the same attributes as upcoming events.
  // Always scan rendered-visible text as a second source, then deduplicate.
  const text=visibleText(decoded);
  const patterns=[
    /Upcoming Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|AM|PM))?/gi,
    /Completed Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s*,\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*\d+(?:\.\d+)?\s*,?\s*(?:to|-)\s*,?\s*\d+(?:\.\d+)?/gi,
    /Completed Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s*,\s*,\s*[^.]{1,100}?(?=(?:Upcoming|Completed|Live) Event:|$)/gi,
    /Live Event:\s*.+?\s+(?:versus|vs\.?|at)\s+.+?(?:\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})?(?=(?:Upcoming|Completed|Live) Event:|$)/gi
  ];
  for(const re of patterns)while((m=re.exec(text)))add(m[0]);
  return out;
}
// The season heading depends only on the page. Every schedule parser calls
// this once per card, so read the page's visible text once per page: large
// SIDEARM pages (~900 KB) otherwise cost hundreds of CPU milliseconds and
// intermittently exceed the Worker's CPU limit (Cloudflare 1102).
let scheduleYearPage={raw:null,range:null,single:null};
function scheduleYearHeadings(raw){
  if(scheduleYearPage.raw!==raw){
    const text=visibleText(raw);
    scheduleYearPage={raw,range:text.match(/\b(20\d{2})\s*[-–]\s*(\d{2,4})\b[^.]{0,80}\bSchedule\b/i),single:text.match(/\b(20\d{2})\s+[^.]{0,40}\bSchedule\b/i)};
  }
  return scheduleYearPage;
}
function scheduleYearForDate(raw,dateText,now){
  const {range,single}=scheduleYearHeadings(raw);
  if(range){
    const start=Number(range[1]),end=Number(range[2].length===2?String(start).slice(0,2)+range[2]:range[2]);
    const monthName=String(dateText||'').trim().slice(0,3).toLowerCase(),month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName)+1;
    if(month)return month>=7?start:end;
  }
  return Number((single||[])[1])||now.getUTCFullYear();
}
function parseSidearmGameCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*data-test-id=["']s-game-card-standard__root["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opponentLink=visibleText((block.match(/<a\b[^>]*data-test-id=["']s-game-card-standard__header-team-opponent-link["'][^>]*>([\s\S]*?)<\/a>/i)||[])[1]);
    const meetName=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-team-event-info["'][^>]*>[\s\S]{0,1200}?<p\b[^>]*>([\s\S]*?)<\/p>/i)||[])[1]);
    const opponent=opponentLink||meetName;
    const dateText=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-date(?:-details)?["'][^>]*>([\s\S]*?)<\/span>|data-test-id=["']s-game-card-standard__header-game-date["'][^>]*>([\s\S]*?)<\/p>/i)||[]).slice(1).find(Boolean));
    if(!opponent||!dateText)continue;
    const relation=(visibleText((block.match(/<span\b[^>]*class=["'][^"']*s-stamp__text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])||(eventType(sport)==='MEET'?'at':'vs')).toLowerCase()==='at'?'at':'vs';
    const result=visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-team-score["'][^>]*>([\s\S]*?)<\/span>/i)||block.match(/data-test-id=["']s-game-card-standard__header-game-pre-score["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])
      ||visibleText((block.match(/data-test-id=["']s-game-card-standard__header-game-post-score["'][^>]*>([\s\S]*?)<\/span>/i)||[])[1])
      ||(eventType(sport)==='MEET'?(visibleText(block).match(/\b(?:\d+(?:st|nd|rd|th)\s*-\s*\d+\s*pts?\.?|M:\s*[^|]{1,35}(?:\|\s*W:\s*[^|]{1,35})?|No Team Scores)\b/i)||[])[0]:null);
    // New SIDEARM cards render outcomes as "W Win 70-7", "L Loss 1-3",
    // "T Tie 1-1", or "D Draw 0-0". Accept both the short marker and the
    // expanded word so completed games are never mistaken for upcoming ones.
    const score=result?.match(/\b([WLTD])\b(?:\s*,?\s*(?:Win|Loss|Tie|Draw))?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const year=scheduleYearForDate(raw,dateText,now);
    const date=`${dateText.replace(/\([^)]*\)/g,'').trim()}, ${year}`;
    const scheduledDay=new Date(`${date} 23:59:59`);
    const completedMeet=eventType(sport)==='MEET'&&!Number.isNaN(scheduledDay.getTime())&&scheduledDay<now;
    const status=score||(eventType(sport)==='MEET'&&result)||completedMeet?'Final':'Upcoming';
    const event=makeEvent({school,sport,status,relation,opponent,date,time:null,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result||(completedMeet?'Completed':null),sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label=["'][^"']*Recap[^"']*["'])[^>]*>/i)||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?\bRecap\b[\s\S]{0,500}?<\/a>/i);
    if(recapLink)event.recap_url=absoluteUrl(recapLink[1],sourceUrl);
    const resultLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label|title)=["'][^"']*Results?[^"']*["'][^>]*>/i)
      ||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,300}?\bResults?\b[\s\S]{0,300}?<\/a>/i)
      ||block.match(/<a\b[^>]*href=["']([^"']*(?:tfrrs\.org\/results\/xc\/|\/documents\/[^"']+\.pdf(?:\?[^"']*)?))[^"']*["'][^>]*>/i);
    if(resultLink&&!event.kansas_results_verified)event.result_url=absoluteUrl(resultLink[1],sourceUrl);
    events.push(event);
  }
  return events;
}
function parseSidearmGameCenterCards(raw,school,sport,sourceUrl,now){
  // Legacy/standard SIDEARM pages already have a cheaper exact parser. Do not
  // run this large-card scan over those documents as well.
  if(/data-test-id=["']s-game-card-standard__root["']/i.test(raw))return[];
  const starts=[...raw.matchAll(/<div\b[^>]*class=["'][^"']*\bs-game-card\s+s-game-card__game-center\b[^"']*["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const rawOpponent=visibleText((block.match(/<p\b[^>]*class=["'][^"']*s-game-card__opponent-name[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)||[])[1]);
    const relation=/^at\b/i.test(rawOpponent)?'at':'vs',opponent=clean(rawOpponent?.replace(/^(?:at|vs\.?|versus)\s+/i,''));
    const dateBox=(block.match(/<div\b[^>]*class=["'][^"']*s-game-card__date--desktop[^"']*["'][^>]*>([\s\S]{0,600}?)<\/div>/i)||[])[1];
    const dateParts=[...(dateBox||'').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    if(!opponent||dateParts.length<2)continue;
    const scoreBox=(block.match(/<div\b[^>]*class=["'][^"']*s-game-card__status-time-and-score__game-score[^"']*["'][^>]*>([\s\S]{0,12000}?)<\/div>\s*<\/div>/i)||[])[1]||'';
    const scores=[...scoreBox.matchAll(/<span\b[^>]*class=["'][^"']*s-text-title(?:\s|["'])[^"']*["'][^>]*>\s*(\d+)\s*<\/span>/gi)].map(x=>x[1]);
    // Game-center cards display the opponent score before the selected school's score.
    const opponentScore=scores[0]||null,schoolScore=scores[1]||null,status=schoolScore!=null&&opponentScore!=null?'Final':'Upcoming';
    const year=scheduleYearForDate(raw,`${dateParts[0]} ${dateParts[1]}`,now),date=`${dateParts[0]} ${dateParts[1]}, ${year}`;
    const event=makeEvent({school,sport,status,relation,opponent,date,time:null,schoolScore,oppScore:opponentScore,resultText:status==='Final'?`${schoolScore}-${opponentScore}`:null,sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*(?:aria-label=["'][^"']*Recap[^"']*["'])[^>]*>/i)||block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]{0,500}?\bRecap\b[\s\S]{0,500}?<\/a>/i);
    if(recapLink)event.recap_url=absoluteUrl(recapLink[1],sourceUrl);
    events.push(event);
  }
  return events;
}
function parseWmtScheduleCards(raw,school,sport,sourceUrl,now){
  const starts=[...raw.matchAll(/<div\b[^>]*class=["'][^"']*\bschedule-event-item(?=\s|["'])[^"']*["'][^>]*>/gi)].map(x=>x.index),events=[];
  for(let i=0;i<starts.length;i++){
    const block=raw.slice(starts[i],starts[i+1]||Math.min(raw.length,starts[i]+60000));
    const opening=(block.match(/^<div\b[^>]*>/i)||[])[0]||'';
    // WMT has two live layouts: the legacy grid card and the newer Nuxt card.
    // Treat a published result as completion even when the new card omits the
    // old schedule-event-item--completed modifier.
    const rawResult=visibleText((
      block.match(/schedule-event-grid-result__label[^>]*>([\s\S]{0,900}?)<\/strong>/i)
      ||block.match(/schedule-event-item-result__label[^>]*>([\s\S]{0,900}?)<\/div>/i)
      ||[]
    )[1]);
    let completed=/schedule-event-item--completed/i.test(opening)||/^(?:[WLTD]\b|Win\b|Loss\b|Tie\b|Draw\b|Final\b|Completed\b|No Team Scores\b|\d+(?:st|nd|rd|th)\b)/i.test(rawResult||'');
    const dateBox=(
      block.match(/schedule-event-grid-date-mobile__box[^>]*>([\s\S]{0,700}?)<\/strong>/i)
      ||block.match(/schedule-event-date__box[^>]*>([\s\S]{0,1200}?)<\/strong>/i)
      ||[]
    )[1];
    let dateParts=[...(dateBox||'').matchAll(/<time\b[^>]*>([\s\S]*?)<\/time>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    // Current WMT cards split dates into month and day spans instead of the
    // older date-box strong element. Without this fallback, only future
    // Schema.org events survive and every completed result disappears.
    if(!dateParts.length){
      const splitMonth=visibleText((block.match(/schedule-event-date__month[^>]*>([\s\S]{0,100}?)<\/span>/i)||[])[1]);
      const splitDay=visibleText((block.match(/schedule-event-date__day[^>]*>([\s\S]{0,40}?)<\/span>/i)||[])[1]);
      if(splitMonth&&splitDay)dateParts=[`${splitMonth} ${splitDay}`];
    }
    if(!dateParts.length){
      const splitTimes=[...block.matchAll(/<time\b[^>]*>([\s\S]{0,100}?)<\/time>/gi)].slice(0,2).map(x=>visibleText(x[1])).filter(Boolean);
      if(splitTimes.length>=2)dateParts=[`${splitTimes[0]} ${splitTimes[1]}`];
    }
    const legacyName=block.match(/schedule-default-event__name[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>([\s\S]{0,500}?)<\/strong>/i);
    const defaultNames=[...block.matchAll(/<strong\b[^>]*class=["'][^"']*schedule-default-event__name(?=\s|["'])[^"']*["'][^>]*>([\s\S]{0,1000}?)<\/strong>/gi)].map(x=>visibleText(x[1])).filter(Boolean);
    const modernOpponent=visibleText((block.match(/schedule-event-item__opponent-name[^>]*>([\s\S]{0,500}?)<\/strong>/i)||[])[1]);
    const modernRelation=visibleText((block.match(/(?:schedule-event-item|schedule-default-event)__divider[^>]*>([\s\S]{0,100}?)<\/strong>/i)||[])[1]);
    const relation=(modernRelation||visibleText(legacyName?.[1])).toLowerCase().startsWith('at')?'at':'vs';
    const defaultOpponent=defaultNames.find(name=>matchText(name)!==matchText(school.name));
    const opponent=modernOpponent||defaultOpponent||visibleText(legacyName?.[2]);
    if(dateParts.length<1||!opponent)continue;
    // WMT publishers such as Cincinnati prefix card dates with a weekday
    // ("Sat Nov 28"). Normalize that display-only prefix so the canonical
    // date parser can enforce future/final status correctly.
    const dateText=dateParts[0].replace(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\s+/i,''),time=dateParts[1]||null,year=scheduleYearForDate(raw,dateText,now);
    // Meet publishers often leave only "All Day" on completed cards. The
    // official scheduled date is still safe completion evidence once that
    // calendar day has ended; future time labels remain Upcoming.
    const scheduledDay=new Date(`${dateText}, ${year} 23:59:59`);
    if(eventType(sport)==='MEET'&&!Number.isNaN(scheduledDay.getTime())&&scheduledDay<now)completed=true;
    const scoreText=rawResult||visibleText(block);
    const score=scoreText.match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i)
      ||visibleText(block).match(/\b([WLTD])\b\s*(?:Win|Loss|Tie|Draw)?\s*,?\s*(\d+)\s*[-–]\s*(\d+)/i);
    const meaningfulResult=/^(?:[WLTD]\b|Win\b|Loss\b|Tie\b|Draw\b|Final\b|Completed\b|No Team Scores\b|\d+(?:st|nd|rd|th)\b)/i.test(rawResult||'');
    const result=score?`${score[1].toUpperCase()}, ${score[2]}-${score[3]}`:(completed?(meaningfulResult?rawResult:'Completed'):null);
    const date=`${dateText}, ${year}`;
    const event=makeEvent({school,sport,status:completed?'Final':'Upcoming',relation,opponent,date,time,schoolScore:score?.[2]||null,oppScore:score?.[3]||null,resultText:result,sourceUrl,now});
    const recapLink=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/i);
    const cardRecap=recapLink?absoluteUrl(recapLink[1],sourceUrl):null;
    if(cardRecap)event.recap_url=cardRecap;
    events.push(event);
  }
  return events;
}
function parseSchemaEvents(raw,school,sport,sourceUrl,now){
  const events=[];let m;
  const re=/\{[^{}]{0,500}"@type":"Event"[\s\S]{0,2500}?"name":"([^"]+)"[\s\S]{0,1200}?"startDate":"(20\d{2}-\d{2}-\d{2})[^"}]*"/gi;
  while((m=re.exec(raw))){
    const name=decodeHtml(m[1]),dateObj=new Date(`${m[2]}T12:00:00Z`);
    if(dateObj.getTime()<now.getTime()-86400000)continue;
    const relation=/\sat\s/i.test(name)?'at':'vs',opponent=clean(name.split(/\s+(?:vs\.|vs|at)\s+/i).slice(1).join(' '));
    if(!opponent)continue;
    const date=dateObj.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
    events.push(makeEvent({school,sport,status:'Upcoming',relation,opponent,date,time:null,schoolScore:null,oppScore:null,resultText:null,sourceUrl,now}));
  }
  return events;
}
function parseTextScheduleRows(raw,school,sport,sourceUrl,now){
  const events=[];let row;
  const rows=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  while((row=rows.exec(raw))){
    const cells=[];let cell;
    const cellRe=/<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    while((cell=cellRe.exec(row[1])))cells.push(visibleText(cell[1]));
    if(cells.length<7)continue;
    const [dateText,time,site,opponent,,,publishedResult]=cells;
    const category=cells[5];
    if(category&&!sportMatches(category,sport))continue;
    const year=scheduleYearForDate(raw,dateText,now),date=`${dateText.replace(/\s*\([^)]*\)\s*$/,'')}, ${year}`;
    const parsedDay=Date.parse(`${date} ${time||''}`),today=schoolToday(now,school);
    const meaningfulResult=clean(publishedResult?.replace(/^(?:N|H|A)\s*-?\s*/i,''));
    const completed=Number.isFinite(parsedDay)&&parsedDay<today;
    const resultText=meaningfulResult&&!/^-?$/.test(meaningfulResult)?meaningfulResult:(completed?'Completed':null);
    events.push(makeEvent({school,sport,status:completed?'Final':'Upcoming',relation:/away/i.test(site)?'at':'vs',opponent,date,time,schoolScore:null,oppScore:null,resultText,sourceUrl,now}));
  }
  return events;
}
// Every schedule's events, each game marked as a conference game or not
// (src/conference-games.mjs), for the sport's conference record.
const {markConferenceGames}=createConferenceGames({schools,membersOf:conferenceMembers});
function parseHtml(raw,school,sport,sourceUrl,now=new Date()){
  return markConferenceGames(parseScheduleEvents(raw,school,sport,sourceUrl,now),raw,school,sourceUrl);
}
function parseScheduleEvents(raw,school,sport,sourceUrl,now=new Date()){
  const ownReader=schoolModule(school.id)?.parseSchedule;
  if(ownReader){const events=ownReader(raw,school,sport,sourceUrl,now);if(events!==null)return events;}
  // Athletics sites routinely combine old and new widgets during redesigns.
  // Run every platform adapter and merge normalized events; never stop after the
  // first parser returns a partial schedule.
  const eventLists=[];
  eventLists.push(extractEventLabels(raw).map(label=>parseLabel(label,school,sport,sourceUrl,now)).filter(Boolean));
  const sourceAdapters=[
    {name:'sidearm',parse:parseSidearmGameCards},
    {name:'sidearm-game-center',parse:parseSidearmGameCenterCards},
    {name:'wmt',parse:parseWmtScheduleCards},
    {name:'text-schedule',parse:parseTextScheduleRows},
    {name:'schema',parse:parseSchemaEvents}
  ];
  for(const adapter of sourceAdapters)eventLists.push(adapter.parse(raw,school,sport,sourceUrl,now));
  const merged=mergeEvents(eventLists);
  const scheduleEvents=schoolModule(school.id)?.scheduleEvents;
  const events=scheduleEvents?scheduleEvents(merged,raw,school,sport,sourceUrl,now):merged,rank={Live:0,Today:1,Upcoming:2,Final:3,Unknown:4};
  return events.sort((a,b)=>{const r=(rank[a.status]??4)-(rank[b.status]??4);if(r)return r;const ta=a.start_time?Date.parse(a.start_time):0,tb=b.start_time?Date.parse(b.start_time):0;return a.status==='Final'?tb-ta:ta-tb;});
}
const COMPACTED_HOSTS=new Set();
function compactScheduleHtml(raw,sourceUrl){
  let host='';try{host=new URL(sourceUrl).hostname.replace(/^www\./,'')}catch{return raw}
  // No site is compacted today: Colorado's and Houston's pages are read whole
  // by their modules (the page data sits after the cards). A host added here
  // keeps only its cards for the shared parsers.
  if(!COMPACTED_HOSTS.has(host))return raw;
  const markers=['data-test-id="s-game-card-standard__root"',"data-test-id='s-game-card-standard__root'",'schedule-event-item'];
  const starts=markers.map(marker=>raw.indexOf(marker)).filter(index=>index>=0);
  if(!starts.length)return raw;
  const start=Math.min(...starts),table=raw.indexOf('schedule__view-box--table',start),footer=raw.indexOf('<footer',start);
  let end=[table,footer].filter(index=>index>start).sort((a,b)=>a-b)[0]||Math.min(raw.length,start+1500000);
  end=Math.min(raw.length,end+4000);
  return raw.slice(0,50000)+raw.slice(Math.max(0,start-1000),end);
}
function eventMergeKey(e){const day=e.start_time?e.start_time.slice(0,10):'';return`${e.school_id}|${e.sport}|${e.team_label||''}|${slug(e.opponent||'')}|${day}${e.school_id==='kansas'&&e.official_event_id?'|'+e.official_event_id:''}${e.game_number?'|game-'+e.game_number:''}`;}
function mergeEvents(eventLists){const statusWeight={Unknown:0,Upcoming:1,Today:2,Live:3,Final:4},byKey=new Map();for(const events of eventLists)for(const e of events){const key=eventMergeKey(e),prev=byKey.get(key);if(!prev){byKey.set(key,e);continue;}const ew=statusWeight[e.status]??0,pw=statusWeight[prev.status]??0,ed=(e.recap_result_count?100:0)+(e.school_score&&e.opponent_score?2:0)+(e.result_count||0)+(e.highlights?.length||0)*2+(e.recap_url?2:0),pd=(prev.recap_result_count?100:0)+(prev.school_score&&prev.opponent_score?2:0)+(prev.result_count||0)+(prev.highlights?.length||0)*2+(prev.recap_url?2:0);if(ew>pw||(ew===pw&&ed>pd))byKey.set(key,e);}return[...byKey.values()];}
// Pro leagues whose season is not the college one: MLS plays late February to
// early December, MLB late March to the World Series (early November).
const PRO_SEASONS={Soccer:[[2,12]],Baseball:[[3,11]]};
function inSeason(sport,month,pro=false){const windows=(pro&&PRO_SEASONS[sport])||SEASONS[sport];if(!windows)return true;return windows.some(([a,b])=>a<=b?month>=a&&month<=b:month>=a||month<=b);}
// A sport's overall record this season (user, October 7: "the sports overall
// win/loss record for every sport"), counted from its finals' W/L/T results
// as the official schedule publishes them (games, duals, and gymnastics or
// swimming scored against an opponent). Exhibitions do not count; meets and
// tournaments published as places have none. Men's and women's teams of a
// combined sport keep separate records.
// Months whose games count toward the record: summer tours (basketball) and
// fall ball (baseball, softball) are not part of the official record.
const RECORD_MONTHS={Basketball:[11,12,1,2,3,4],Baseball:[2,3,4,5,6],Softball:[2,3,4,5,6]};
function seasonRecords(results){
  const byTeam=new Map();
  for(const e of results){
    // A pro season's games all count (MLB plays April to September).
    const months=e.pro?null:RECORD_MONTHS[e.sport],month=Number(String(e.start_time||'').slice(5,7));
    if(months&&!months.includes(month))continue;
    // NFL playoffs are not part of the season record.
    if(e.not_in_record)continue;
    if(e.exhibition||/\bexhib|\(exh\.?\)|\(ex\.\)|\bscrimmage\b/i.test(`${e.opponent||''} ${e.title||''}`))continue;
    const outcome=(String(e.headline||'').match(/^(W|L|T|D)\b/)||[])[1];if(!outcome)continue;
    const team=e.team_label||null,record=byTeam.get(team)||{team_label:team,wins:0,losses:0,ties:0,conference:{wins:0,losses:0,ties:0,games:0}};
    const add=tally=>{if(outcome==='W')tally.wins++;else if(outcome==='L')tally.losses++;else tally.ties++;};
    add(record);
    // The conference record counts the games the school marks as conference
    // games (or, without that mark, regular-season games against members).
    // A team in another conference for its sport names it (Kentucky men's
    // soccer: the Sun Belt).
    if(e.conference_game===true){add(record.conference);record.conference.games++;if(e.conference_name)record.conference.name=e.conference_name;}
    byTeam.set(team,record);
  }
  const text=r=>`${r.wins}-${r.losses}${r.ties?`-${r.ties}`:''}`;
  const conference=catalogSchool(results[0]?.school_id)?.conference||null;
  return[...byTeam.values()].sort((a,b)=>String(a.team_label||'').localeCompare(String(b.team_label||''))).map(r=>{
    const {games,name,...tally}=r.conference;
    return{...r,text:text(r),conference:games&&(name||conference)?{name:name||conference,...tally,text:text(tally)}:null};
  });
}
// College tennis schedules also list the pro events their players enter on
// their own: ITF "M25 Las Vegas", "W35 Norman, OK" and "University of Arkansas
// M15 Open" (an ITF level anywhere in the name), ATP and WTA events,
// Challengers, the UTR Pro Tennis Tour. They are not the team's (user, October
// 29: "Please check these tennis results"; LSU's own rule since October 9).
// "ITF Sectionals" (Ole Miss's spelling of the ITA Sectionals) stays.
const PRO_TENNIS_EVENT=/^(?:#\d+\s+)?(?:(?:ATP|ITF|WTA)\b|UTR (?:Pro|PTT)\b)|\b[MW](?:15|25|35|50|60|75|80|100)\b|\bChallenger\b/i;
const proTennisEvent=e=>e.sport==='Tennis'&&PRO_TENNIS_EVENT.test(e.opponent||'')&&!/\bSectionals?\b/i.test(e.opponent||'');
function groupEvents(events,now=new Date()){events=events.filter(e=>!proTennisEvent(e));if(!events.length)return[];const sport=events[0].sport,groupSchool=catalogSchool(events[0].school_id),local=schoolNow(now,groupSchool);if(!isHighSchool(groupSchool)&&!isPro(groupSchool))events=filterActiveSeason(events,sport,local);if(!events.length)return[];const school=events[0],live=[],results=[],upcoming=[],other=[],today=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());for(const e of events){if(e.status==='Live')live.push(e);else if(e.status==='Final')results.push(e);else if(e.status==='Upcoming'||e.status==='Today'){const eventDay=e.start_time?Date.parse(e.start_time.slice(0,10)+'T00:00:00Z'):NaN;const lastDay=e.end_time?Date.parse(String(e.end_time).slice(0,10)+'T00:00:00Z'):NaN;if(!Number.isFinite(eventDay)||eventDay>=today||Number.isFinite(lastDay)&&lastDay>=today)upcoming.push(e);}else other.push(e);}results.sort((a,b)=>(Date.parse(b.start_time)||0)-(Date.parse(a.start_time)||0));upcoming.sort((a,b)=>(Date.parse(a.start_time)||Infinity)-(Date.parse(b.start_time)||Infinity));const active=inSeason(sport,now.getUTCMonth()+1,isPro(groupSchool)),latest=results.map(e=>e.start_time).filter(Boolean).sort().at(-1)||null,next=upcoming.map(e=>e.start_time).filter(Boolean).sort()[0]||null;return[{school_id:school.school_id,school:school.school,sport,in_season:active,season_label:active?'In season':'Out of season',records:seasonRecords(results),live,results,upcoming,other,latest_activity_at:latest,next_activity_at:next}];}
function absoluteUrl(href,base){try{return new URL(decodeHtml(href),base).href}catch{return null}}
function recapUrlsByEvent(raw,school,sport,sourceUrl,now){
  const map=new Map(),markers=[],seenMarker=new Set();
  const addMarker=(label,index,length)=>{
    const event=parseLabel(visibleText(label),school,sport,sourceUrl,now);
    if(!event||event.status!=='Final')return;
    const id=`${eventMergeKey(event)}|${index}`;
    if(!seenMarker.has(id)){seenMarker.add(id);markers.push({event,index,end:index+length});}
  };
  let m;
  const attr=/(?:aria-label|title)\s*=\s*["']([^"']*Completed Event:[^"']*)["']/gi;
  while((m=attr.exec(raw)))addMarker(m[1],m.index,m[0].length);
  const heading=/<h[1-6]\b[^>]*>([\s\S]*?Completed Event:[\s\S]*?)<\/h[1-6]>/gi;
  while((m=heading.exec(raw)))addMarker(m[1],m.index,m[0].length);
  markers.sort((a,b)=>a.index-b.index);
  for(let i=0;i<markers.length;i++){
    const marker=markers[i],next=markers.find(x=>x.index>marker.index);
    const block=raw.slice(marker.end,Math.min(next?.index||raw.length,marker.end+40000));
    const link=block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?\bRecap\b[\s\S]*?)<\/a>/i);
    const recapUrl=link?absoluteUrl(link[1],sourceUrl):null;
    if(recapUrl)map.set(eventMergeKey(marker.event),recapUrl);
  }
  const candidates=[] ,seenCandidates=new Set(map.values());
  const anyRecap=/<a\b[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*?\bRecap\b(?:(?!<\/a>)[\s\S])*?)<\/a>/gi;
  while((m=anyRecap.exec(raw))){
    const recapUrl=absoluteUrl(m[1],sourceUrl);
    if(recapUrl&&!seenCandidates.has(recapUrl)){seenCandidates.add(recapUrl);candidates.push(recapUrl);}
  }
  // K-State sometimes labels a final only as "Game Center" even when the official
  // recap exists in the sport's Related News. Include official dated news articles
  // as candidates; recapMatchesEvent still requires the exact sport, opponent and date.
  const newsLink=/<a\b[^>]*href=["']([^"']*\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)[^"']*["'][^>]*>/gi;
  while((m=newsLink.exec(raw))){
    const articleUrl=absoluteUrl(m[1],sourceUrl);
    if(articleUrl&&!seenCandidates.has(articleUrl)){seenCandidates.add(articleUrl);candidates.push(articleUrl);}
  }
  return{map,candidates:[...map.values(),...candidates]};
}
function shortHighlight(text){
  let item=clean(text);if(!item)return null;
  const words=item.split(/\s+/);
  if(words.length>22||!/[.!?]$/.test(item))return null;
  return item;
}
function extractOfficialHighlights(raw){
  const items=[];
  const add=x=>{x=shortHighlight(visibleText(x));if(x&&x.length>=25&&!items.includes(x))items.push(x);};
  const meta=raw.match(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/i)
    ||raw.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["']/i);
  if(meta)add(meta[1]);
  const hit=raw.search(/HOW IT HAPPENED/i);
  if(hit>=0){
    let section=raw.slice(hit,hit+30000);
    const stop=section.slice(20).search(/(?:QUICK FACTS|TEAM NOTES|PLAYER NOTES|UP NEXT|FROM THE HEAD COACH)/i);
    if(stop>=0)section=section.slice(0,stop+20);
    let m;const block=/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi;
    while((m=block.exec(section))&&items.length<5)add(m[1]);
  }
  return items.slice(0,5);
}
function automaticFinalHighlights(e){
  const items=[];
  if(e.school_score!=null&&e.opponent_score!=null){
    const schoolScore=Number(e.school_score),opponentScore=Number(e.opponent_score);
    items.push(`Final score: ${e.school} ${e.school_score}, ${e.opponent} ${e.opponent_score}.`);
    if(Number.isFinite(schoolScore)&&Number.isFinite(opponentScore)){
      if(schoolScore===opponentScore)items.push(`The event finished tied at ${schoolScore}-${opponentScore}.`);
      else if(schoolScore>opponentScore){
        const margin=schoolScore-opponentScore;
        const unit=e.sport==='Soccer'?'goal':e.sport==='Volleyball'?'set':e.sport==='Baseball'||e.sport==='Softball'?'run':'point';
        items.push(`${e.school} earned the victory by ${margin} ${unit}${margin===1?'':'s'}.`);
        if(opponentScore===0)items.push(`${e.school} recorded a shutout.`);
        if(e.sport==='Volleyball'&&schoolScore===3&&opponentScore===0)items.push(`${e.school} completed a straight-set sweep.`);
      }else{
        const margin=opponentScore-schoolScore;
        const unit=e.sport==='Soccer'?'goal':e.sport==='Volleyball'?'set':e.sport==='Baseball'||e.sport==='Softball'?'run':'point';
        items.push(`${e.opponent} won by ${margin} ${unit}${margin===1?'':'s'}.`);
      }
    }
  }else if(e.headline)items.push(`Official result: ${e.headline}.`);
  else items.push(`${e.school} completed its ${e.sport} event against ${e.opponent||'the listed opponent'}.`);
  return items;
}
function matchText(s){return String(s||'').toLowerCase().replace(/\b(?:exhibition|neutral|rv|ranked)\b/g,' ').replace(/#[0-9]+|\([^)]+\)/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
// The catalog entry an event's opponent names: one indexed query on D1
// (catalog_names), the same rule over the bundled list otherwise.
async function opponentSchoolFor(event,currentSchool){
  const wanted=matchText(event.opponent);
  if(!wanted)return null;
  const db=await catalogD1();
  if(db){try{const id=await catalogOpponent(db,wanted,currentSchool.id);if(!id)return null;return catalogSchool(id)||(await catalogRecords(db,[id]))[0]||null}catch{}}
  return schools.find(candidate=>candidate.id!==currentSchool.id&&[candidate.name,candidate.short_name,...(candidate.aliases||[])]
    .some(label=>{const value=matchText(label);return value===wanted||(value.length>3&&wanted.length>3&&(value.includes(wanted)||wanted.includes(value)));}))||null;
}
function recapMatchesEvent(raw,e,recapUrl=''){
  // Match against the article itself, not navigation or schedule widgets that can
  // contain unrelated opponents and dates.
  const title=(raw.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
  const article=recapArticleText(raw);
  const text=matchText(`${title} ${article}`);
  const opponent=matchText(e.opponent);
  const articleWords=text.split(' '),opponentTokens=opponent.split(' ').filter(word=>word.length>=4&&!['team','senior','national'].includes(word));
  const fuzzyOpponent=opponentTokens.length&&opponentTokens.every(token=>articleWords.some(word=>word.startsWith(token.slice(0,7))));
  if(!opponent||(!text.includes(opponent)&&!fuzzyOpponent))return false;
  const sportName=matchText(e.sport);
  if(sportName&&!text.includes(sportName)&&!matchText(recapUrl).includes(sportName))return false;
  const day=e.start_time?.slice(0,10);
  if(day){
    const [year,month,date]=day.split('-').map(Number);
    const urlDate=new RegExp(`/news/${year}/0?${month}/0?${date}/`).test(recapUrl);
    const urlDateMatch=recapUrl.match(/\/news\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//);
    const articleDay=urlDateMatch?Date.UTC(Number(urlDateMatch[1]),Number(urlDateMatch[2])-1,Number(urlDateMatch[3])):NaN;
    const eventDay=Date.UTC(year,month-1,date);
    // Multi-day meets (golf tournaments) publish their recap on the final day,
    // up to several days after the listed start date. Games keep a +/-1 day window.
    const afterStart=e.event_type==='MEET'?4*86400000:86400000;
    const adjacentPublication=Number.isFinite(articleDay)&&articleDay-eventDay>=-86400000&&articleDay-eventDay<=afterStart;
    const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
    const published=matchText((raw.match(/<meta\b[^>]*(?:property|name)=["'](?:article:published_time|date)["'][^>]*content=["']([^"']+)/i)||[])[1]||'');
    const dateText=matchText(`${names[month-1]} ${date} ${year}`);
    if(!urlDate&&!adjacentPublication&&!published.includes(matchText(day))&&!text.includes(dateText))return false;
  }
  return true;
}
function recapArticleText(raw){
  const bodyMatch=raw.match(/"articleBody"\s*:\s*("(?:\\.|[^"\\])*")/i);
  if(bodyMatch){try{return JSON.parse(bodyMatch[1]).slice(0,14000)}catch{}}
  const storyBody=(raw.match(/<div\b[^>]*id=["']storyPageContentBody["'][^>]*>([\s\S]*?)(?=<\/div>\s*<\/(?:div|section)>)/i)||[])[1];
  if(storyBody){
    const text=visibleText(storyBody);
    // A story that opens with nested markup (Georgia football's video table)
    // ends the short read early; read the whole body by matching its divs.
    if(text.length>=80)return text.slice(0,14000);
    const open=raw.match(/<div\b[^>]*id=["']storyPageContentBody["'][^>]*>/i),tags=/<div\b[^>]*>|<\/div>/gi;
    tags.lastIndex=open.index+open[0].length;let depth=1,tag,end=-1;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tag.index;
    if(end>0)return visibleText(raw.slice(open.index+open[0].length,end).replace(/<iframe\b[\s\S]*?<\/iframe>/gi,' ')).slice(0,14000);
    return text.slice(0,14000);
  }
  const article=(raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||[])[1];
  if(article){const text=visibleText(article),hit=text.search(/HOW IT HAPPENED/i);return text.slice(hit>=0?hit:0,hit>=0?hit+12000:14000);}
  // SIDEARM "story blocks" (Mississippi State's football recaps) hold the
  // story in a block wrapper instead of a story body: read the wrapper whole,
  // matching its divs.
  const blocks=raw.match(/<div\b[^>]*class=["']c-story-blocks__wrapper\b[^"']*["'][^>]*>/i);
  if(blocks){
    const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=blocks.index+blocks[0].length;let depth=1,tag,end=-1;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tag.index;
    const text=end>0?visibleText(raw.slice(blocks.index+blocks[0].length,end).replace(/<iframe\b[\s\S]*?<\/iframe>/gi,' ')):'';
    if(text.length>=80)return text.slice(0,14000);
  }
  // WordPress stories (Arkansas's) hold the text in div.article-paragraph;
  // South Carolina's second template in div.article__paragraphs.
  const paragraphs=raw.match(/<div\b[^>]*class=["']article(?:-paragraph|__paragraphs)\b[^"']*["'][^>]*>/i);
  if(paragraphs){
    const tags=/<div\b[^>]*>|<\/div>/gi;tags.lastIndex=paragraphs.index+paragraphs[0].length;let depth=1,tag,end=-1;
    while(depth&&(tag=tags.exec(raw)))if((depth+=tag[0][1]==='/'?-1:1)===0)end=tag.index;
    const text=end>0?visibleText(raw.slice(paragraphs.index+paragraphs[0].length,end).replace(/<iframe\b[\s\S]*?<\/iframe>/gi,' ')):'';
    if(text.length>=80)return text.slice(0,14000);
  }
  // Kentucky's WordPress stories hold the text in section.article_text or
  // section.article-text (one section or several, between photos).
  const sections=[...raw.matchAll(/<section\b[^>]*class=["']article[_-]text\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi)].map(m=>visibleText(m[1].replace(/<iframe\b[\s\S]*?<\/iframe>/gi,' '))).filter(Boolean);
  if(sections.join(' ').length>=80)return sections.join(' ').slice(0,14000);
  // WMT stores article paragraphs in its embedded application payload instead
  // of articleBody or server-rendered <article> markup. Keep this last because
  // a page payload can include several unrelated stories and meet results.
  const payloadParts=[];let payloadMatch;
  const payloadRe=/"content","((?:\\.|[^"\\]){80,})"/gi;
  while((payloadMatch=payloadRe.exec(raw))&&payloadParts.length<20){
    try{
      const decoded=JSON.parse(`"${payloadMatch[1]}"`);
      if(/<p\b|<br\b|<li\b/i.test(decoded))payloadParts.push(visibleText(decoded));
    }catch{}
  }
  const payloadText=clean(payloadParts.join(' '));
  if(payloadText&&payloadText.length>=80)return payloadText.slice(0,14000);
  return'';
}
function highlightPriorities(sport){
  const s=matchText(sport);
  if(s.includes('football'))return'touchdowns, pivotal drives, turnovers, explosive plays, defensive stops, and records';
  if(s.includes('volleyball'))return'set swings, decisive runs, kills, hitting efficiency, blocks, aces, and match records';
  if(s.includes('soccer'))return'goals with minutes and assists, saves, disallowed goals, cards, shot pressure, and records';
  if(s.includes('cross country'))return'individual places and times, team scoring, winning margins, course records, and personal bests';
  if(s.includes('basketball'))return'decisive scoring runs, lead changes, clutch baskets, standout stat lines, rebounds, assists, and records';
  if(s.includes('baseball')||s.includes('softball'))return'scoring innings, go-ahead hits, home runs, pitching performances, defensive plays, and records';
  if(s.includes('track')||s.includes('swimming'))return'winning performances, times or marks, records, qualifying standards, relays, and team placement';
  if(s.includes('wrestling'))return'pivotal bouts, falls, technical falls, ranked wins, bonus points, and team-score swings';
  if(s.includes('tennis'))return'decisive singles and doubles matches, tiebreaks, clinching points, ranked wins, and comebacks';
  if(s.includes('golf'))return'round scores, leaderboard movement, birdie runs, individual placement, team placement, and records';
  if(s.includes('rowing'))return'boat classes, finish times, margins, heat progression, medal finishes, and team placement';
  return'decisive moments, standout participants, score changes, records, milestones, and sport-specific statistics';
}
function recapAthleteResult(article,participant){
  const lower=article.toLowerCase(),name=participant.toLowerCase();let at=lower.indexOf(name);
  const words={first:'1st',second:'2nd',third:'3rd',fourth:'4th',fifth:'5th',sixth:'6th',seventh:'7th',eighth:'8th',ninth:'9th',tenth:'10th'};
  while(at>=0){
    const statement=article.slice(at,at+name.length+190).split(/[.!?]\s/)[0];
    const time=statement.match(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/);
    const numeric=statement.match(/\b\d+(?:st|nd|rd|th)(?:-place)?\b/i);
    const written=statement.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i);
    const place=numeric?.[0]?.replace(/-place$/i,'')||words[written?.[1]?.toLowerCase()];
    if(place&&time)return`${place} · ${time[0]}`;
    at=lower.indexOf(name,at+name.length);
  }
  return null;
}
function parseCrossCountryRecapRows(raw,event){
  const article=recapArticleText(raw);if(article.length<80)return[];
  const femaleProfiles=(String(raw).match(/"gender":"female"/gi)||[]).length,maleProfiles=(String(raw).match(/"gender":"male"/gi)||[]).length;
  const lead=article.slice(0,1200),division=femaleProfiles>maleProfiles||(/\bwomen(?:'s)?\b/i.test(lead)&&!/\bmen(?:'s)?\b/i.test(lead))?"Women's":"Men's";
  const rows=[],seen=new Set(),add=(participant,result,group=`${division} Individual Results`)=>{const key=matchText(participant);if(key&&!seen.has(key)){seen.add(key);rows.push({group,participant,result})}};
  const teamWin=/\b(?:team title|team victory|won the team|team championship)\b/i.test(article);
  const teamPoints=(article.match(/\b(?:team|knights|wildcats|cougars|utes|cowboys|raiders|bearcats|bears|mountaineers)[^.]{0,90}?\b(\d+)\s+points\b/i)||[])[1];
  if(teamWin)add(`${event.school} team`,teamPoints?`1st · ${teamPoints} pts`:'1st',`${division} Team`);
  const ordinals={first:'1st',second:'2nd',third:'3rd',fourth:'4th',fifth:'5th',sixth:'6th',seventh:'7th',eighth:'8th',ninth:'9th',tenth:'10th'};
  const excluded=new Set(['Florida Intercollegiate','Southern Showcase','Arturo Barrios','Big Twelve','NCAA South','Cross Country','Head Coach','Distance Coach']);
  const linkedNames=[...String(raw).matchAll(/\/roster\/player\/[^"']+["'][^>]*\btitle=["']([^"']+)["']/gi)].map(x=>clean(decodeHtml(x[1]))).filter(Boolean);
  const metadataAthletes=[...String(raw).matchAll(/"givenName":"([^"]+)","familyName":"([^"]+)"[^}]{0,180}?"gender":"(female|male)"/gi)].map(x=>({name:clean(`${decodeHtml(x[1])} ${decodeHtml(x[2])}`),gender:x[3].toLowerCase()})).filter(x=>x.name);
  const metadataNames=metadataAthletes.map(x=>x.name),genderMap=new Map(metadataAthletes.map(x=>[matchText(x.name),x.gender]));
  const officialNames=[...new Set([...linkedNames,...metadataNames])];
  const surnameMap=new Map(officialNames.map(name=>[name.split(/\s+/).at(-1).toLowerCase(),name]));
  const wholeWordLastIndex=(text,term)=>[...text.matchAll(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'g'))].at(-1)?.index??-1;
  for(const timeMatch of article.matchAll(/\b\d{1,2}:\d{2}(?:\.\d+)?\b/g)){
    const before=article.slice(Math.max(0,timeMatch.index-190),timeMatch.index);
    const placeMatches=[...before.matchAll(/\b(\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:-place)?\b/gi)];
    const placeMatch=placeMatches.at(-1);if(!placeMatch)continue;
    const nameArea=before.slice(0,placeMatch.index),names=[...nameArea.matchAll(/\b([A-Z][A-Za-z'’.-]+\s+[A-Z][A-Za-z'’.-]+)\b/g)].map(x=>x[1]);
    const lowerNameArea=nameArea.toLowerCase();
    const identityMatches=[
      ...officialNames.map(name=>({name,index:lowerNameArea.lastIndexOf(name.toLowerCase())})),
      ...surnameMap.entries().map(([last,name])=>({name,index:wholeWordLastIndex(lowerNameArea,last)}))
    ].filter(x=>x.index>=0).sort((a,b)=>b.index-a.index);
    const participant=identityMatches[0]?.name||names.reverse().find(name=>!excluded.has(name)&&!/^Personal Best|Season Best|All Time|Best Finish|Freshm(?:an|en)\b|PL NAME|Cowboy Preview/i.test(name));
    if(!participant)continue;
    const rawPlace=placeMatch[1].toLowerCase(),place=ordinals[rawPlace]||placeMatch[1].replace(/-place$/i,'');
    const athleteDivision=genderMap.get(matchText(participant))==='female'?"Women's":genderMap.get(matchText(participant))==='male'?"Men's":division;
    add(participant,`${place} · ${timeMatch[0]}`,`${athleteDivision} Individual Results`);
  }
  return rows;
}
async function generateAIHighlights(env,e,raw){
  if(e.highlights_verified)return{items:e.highlights,state:'verified'};
  if(!env?.AI)return{items:null,state:'binding_unavailable'};
  const article=recapArticleText(raw);
  if(article.length<80)return{items:null,state:'recap_text_unavailable'};
  const detailedCrossCountry=e.sport==='Cross Country'&&e.event_type==='MEET';
  const prompt=detailedCrossCountry?`Extract the complete ${e.school} cross-country results explicitly stated in this official recap.
Return strict JSON only with this shape:
{"highlights":["four factual complete sentences"],"results":[{"group":"Women's Team or Men's Team or Women's 5K or Men's 8K","participant":"athlete full name or ${e.school} team","result":"place · time and/or team points"}]}
Include separate team rows and every ${e.school} runner whose place or time is stated. Never infer a missing place, time, distance, sex, athlete, or score. Do not include another school's athletes.
Event: ${e.school} at ${e.opponent}; date ${e.start_time?.slice(0,10)||''}
Official recap:
${article.slice(0,10000)}`:`Write exactly four engaging, factual highlights explaining how this ${e.sport} event unfolded.
Use only the official recap. Paraphrase; never copy. Each highlight must be one complete sentence of 16-36 words.
Prioritize ${highlightPriorities(e.sport)}. Include names, timing, score context and why the moment mattered when available.
Reject vague lines like "X scored," "Y won it," or "Team A outshot Team B."
Return four lines only, with each line beginning "- ".

Event: ${e.school} vs ${e.opponent}; date ${e.start_time?.slice(0,10)||''}; final ${e.school_score??''}-${e.opponent_score??''}
Official recap:
${article.slice(0,10000)}`;
  try{
    const request=env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
      messages:[{role:'user',content:prompt}],max_tokens:detailedCrossCountry?1800:500,temperature:0.05
    });
    const out=await Promise.race([
      request,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Highlight generation timed out')),8000))
    ]);
    const response=String(out?.response??out?.result?.response??'').trim();
    let list=[],meetResults=[];
    if(detailedCrossCountry){
      const start=response.indexOf('{'),end=response.lastIndexOf('}');
      if(start>=0&&end>start)try{
        const parsed=JSON.parse(response.slice(start,end+1));
        list=Array.isArray(parsed?.highlights)?parsed.highlights:[];
        const articleKey=matchText(article);
        const verifiedRows=(Array.isArray(parsed?.results)?parsed.results:[]).map(row=>{
          const group=clean(row?.group),participant=clean(row?.participant),result=clean(row?.result);
          if(!group||!participant||!result||result.length>120)return null;
          const isTeam=/\bteam$/i.test(participant),nameKey=matchText(participant.replace(/\s+team$/i,''));
          if(isTeam&&/^1st\b/i.test(result)&&/\b(?:team title|team victory|won the team|team championship)\b/i.test(article))return{group,participant,result:'1st'};
          if(isTeam)return null;
          if(!nameKey||!articleKey.includes(nameKey))return null;
          const sourceResult=recapAthleteResult(article,participant);
          return sourceResult?{group,participant,result:sourceResult}:null;
        }).filter(Boolean);
        const seenParticipants=new Set();
        meetResults=verifiedRows.filter(row=>{const key=matchText(row.participant);if(seenParticipants.has(key))return false;seenParticipants.add(key);return true;});
      }catch{}
    }else{
      const start=response.indexOf('['),end=response.lastIndexOf(']');
      if(start>=0&&end>start){
      try{
        const parsed=JSON.parse(response.slice(start,end+1));
        list=Array.isArray(parsed)?parsed:(parsed?.highlights||[]);
      }catch{}
      }
    }
    if(list.length<3){
      list=response.split(/\n+/)
        .map(x=>clean(x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').replace(/^["']|["',]+$/g,'')))
        .filter(x=>x&&/[.!?]$/.test(x));
    }
    if(list.length<3)list=response.match(/[^.!?\n]{25,}[.!?]/g)||[];
    const cleanItems=[...new Set(list.map(clean))].filter(x=>{
      if(!x||x.length>360||!/[.!?]$/.test(x))return false;
      const words=x.split(/\s+/).length;
      return words>=8&&words<=50;
    }).slice(0,4);
    return cleanItems.length>=3?{items:cleanItems,results:meetResults,state:'recap_generated'}:{items:null,results:meetResults,state:'insufficient_highlights'};
  }catch(error){
    return{items:null,state:'ai_failed',error:clean(error?.message||'AI request failed')?.slice(0,160)||'AI request failed'};
  }
}
async function attachOfficialHighlights(events,raw,school,sport,sourceUrl,now,env=null,aiTargetId=null){
  const target=events.find(e=>e.status==='Final'&&e.id===aiTargetId);
  if(!target)return events;
  // A school module can attach a story the schedule does not link.
  await schoolModule(target.school_id)?.beforeHighlights?.(target);
  // Meets with a school module's official results path use it, as the feed
  // does, with the card's own links; recap prose and AI extraction must not
  // replace it.
  if(moduleCrossCountry(target)){await attachOfficialMeetResults(target);return events;}
  // KU publishes separate race PDFs; the generic first-link resolver selects
  // its cumulative season PDF and must not overwrite verified race rows.
  if(target.school_id!=='kansas'&&!isKStateCrossCountry(target)){
    if(target.event_type==='MEET'&&!target.result_url)target.result_url=discoverOfficialMeetResultUrl(raw,sourceUrl);
    await attachOfficialMeetResults(target);
  }
  if(target.highlights_verified)return events;
  // A card-bound recap is already tied to the exact event. Avoid rescanning a
  // very large schedule document when this direct identity is available.
  const recapIndex=target.recap_url?{map:new Map(),candidates:[]}:recapUrlsByEvent(raw,school,sport,sourceUrl,now);
  const direct=target.recap_url||recapIndex.map.get(eventMergeKey(target));
  const day=(schoolModule(target.school_id)?.meetDayIsLast&&target.event_type==='MEET'?target.end_time||target.start_time:target.start_time)?.slice(0,10)||'';
  const datePath=day?new RegExp(`/news/${day.slice(0,4)}/0?${Number(day.slice(5,7))}/0?${Number(day.slice(8,10))}/`):null;
  const ordered=[direct,...recapIndex.candidates.filter(url=>datePath?.test(url)),...recapIndex.candidates].filter(Boolean);
  const candidates=[...new Set(ordered)].slice(0,8);
  let recapUrl=null,recapHtml=null;
  const tryCandidates=async urls=>{
    for(const candidate of urls){
      try{
        const r=await sourceFetch(candidate);
        if(!r.ok)continue;
        const html=await r.text();
        if((schoolModule(target.school_id)?.matchesRecap||recapMatchesEvent)(html,target,candidate))return{url:candidate,html};
      }catch{}
    }
    return null;
  };
  // The schedule's direct recap is almost always correct. Fetch candidates one at
  // a time and stop on the first exact match instead of downloading every article.
  const scheduledMatch=await tryCandidates(candidates);
  if(scheduledMatch){recapUrl=scheduledMatch.url;recapHtml=scheduledMatch.html;}
  // Some WMT schedules publish completed events before attaching their recap
  // links. The official sport-news archive already contains those recaps, so use
  // it as a same-domain fallback and still require exact opponent, sport and date.
  if(!recapUrl){
    try{
      const newsUrl=new URL(sourceUrl);
      // Most sites list a sport's stories at /news (see SCHOOL_MODULES.newsPath).
      const newsPath=newsUrl.pathname.replace(/\/schedule(?:\/.*)?$/i,schoolModule(school.id)?.newsPath||'/news');
      if(newsPath!==newsUrl.pathname){
        newsUrl.pathname=newsPath;newsUrl.search='';
        const r=await sourceFetch(newsUrl,{},{ttl:SOURCE_TTL.listing});
        if(r.ok){
          const html=await r.text(),links=[];let m;
          const linkHtml=html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
          const newsLink=/<a\b[^>]*href=["']([^"']*\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)[^"']*["'][^>]*>/gi;
          const embeddedNews=/"(https?:\/\/[^"]+\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)"/gi;
          const embeddedRelativeNews=/"(\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'?#]+)"/gi;
          const addNewsLink=value=>{const link=absoluteUrl(value,newsUrl.href);if(link&&datePath?.test(link)&&!links.includes(link))links.push(link);};
          while((m=newsLink.exec(linkHtml))){
            addNewsLink(m[1]);
          }
          while((m=embeddedNews.exec(linkHtml)))addNewsLink(m[1]);
          while((m=embeddedRelativeNews.exec(linkHtml)))addNewsLink(m[1]);
          const newsMatch=await tryCandidates(links.slice(0,8));
          if(newsMatch){recapUrl=newsMatch.url;recapHtml=newsMatch.html;}
        }
      }
    }catch{}
  }
  // A school may publish a box score but no recap even though the opponent
  // published an official article. Check that opponent's official schedule as
  // a controlled fallback, still requiring the exact event date and teams.
  if(!recapUrl){
    const opponentSchool=await opponentSchoolFor(target,school);
    if(opponentSchool){
      for(const opponentScheduleUrl of candidateUrls(opponentSchool,sport).slice(0,4)){
        try{
          const r=await sourceFetch(opponentScheduleUrl,{},{ttl:SOURCE_TTL.listing});if(!r.ok)continue;
          const html=await r.text(),index=recapUrlsByEvent(html,opponentSchool,sport,r.url||opponentScheduleUrl,now);
          const mirror={...target,school_id:opponentSchool.id,school:opponentSchool.short_name||opponentSchool.name,opponent:school.short_name||school.name};
          const directOpponent=index.map.get(eventMergeKey(mirror));
          const orderedOpponent=[directOpponent,...index.candidates.filter(url=>datePath?.test(url)),...index.candidates].filter(Boolean);
          const opponentMatch=await tryCandidates([...new Set(orderedOpponent)].slice(0,8));
          if(opponentMatch){recapUrl=opponentMatch.url;recapHtml=opponentMatch.html;break;}
        }catch{}
      }
    }
  }
  // Results links are not consistently present on schedule cards. Many schools
  // publish the official timing link only inside the recap, so discover and
  // parse it here through the same school-neutral meet-results pipeline.
  if(target.event_type==='MEET'&&recapHtml&&target.school_id!=='kansas'&&!isKStateCrossCountry(target)){
    target.result_url=target.result_url||discoverOfficialMeetResultUrl(recapHtml,recapUrl);
    await attachOfficialMeetResults(target);
  }
  if(!recapUrl){
    // Never leave an unverified schedule-card link behind. The UI must not
    // offer a recap button unless that URL passed the exact event checks.
    delete target.recap_url;
    target.highlights=[];target.highlight_state='recap_not_found';
    target.highlight_status='An exact official recap could not be matched to this event.';
    return events;
  }
  target.recap_url=recapUrl;
  target.source={...target.source,name:target.event_type==='MEET'?'Official athletics meet recap':'Official athletics game recap',url:recapUrl,updated_at:now.toISOString()};
  if(isKStateCrossCountry(target)){
    await attachKStateRecapResults(target,recapHtml,recapUrl);
    return events;
  }
  if(isKansasCrossCountry(target)){
    const attached=await attachKansasRaceDocuments(target,recapHtml,recapUrl,fetchOfficialPdfText);
    if(!attached){
      target.highlights=[];
      target.highlight_state='official_results_unavailable';
      target.highlight_status='Detailed official race results could not be loaded. Open the official recap for full results.';
    }
    return events;
  }
  if(kansasHandlers.applyGolfRecap(target,recapHtml,recapUrl))return events;
  const recapRows=target.sport==='Cross Country'?parseCrossCountryRecapRows(recapHtml,target):[];
  target.recap_result_count=recapRows.length;
  if(recapRows.length){target.results=recapRows;target.result_count=recapRows.length;target.has_more_results=recapRows.length>3;target.meet_results_verified=true;}
  const aiResult=await generateAIHighlights(env,target,recapHtml);
  if(!recapRows.length&&aiResult.results?.length){
    target.results=aiResult.results;
    target.result_count=aiResult.results.length;
    target.has_more_results=aiResult.results.length>3;
    target.meet_results_verified=true;
  }
  target.highlight_state=aiResult.state;
  if(aiResult.error)target.highlight_error=aiResult.error;
  if(aiResult.items){
    target.highlights=aiResult.items;target.highlights_verified=true;target.highlight_status=null;
  }else{
    target.highlights=[];
    target.highlight_status='Verified recap highlights could not be generated. Use the official recap link for this event.';
  }
  return events;
}
async function fetchUrl(url,school,sport,now,env=null,aiTargetId=null){
  const r=await sourceFetch(url,{},{ttl:SOURCE_TTL.schedule}),html=await r.text(),finalUrl=r.url||url;
  const parseable=compactScheduleHtml(html,finalUrl),labels=school.id==='kansas'?[]:extractEventLabels(parseable);
  // Kept before team labeling, which returns a new array: BYU recognizes its
  // own past-season result by identity.
  const parsed=r.ok?parseHtml(parseable,school,sport,finalUrl,now):[];
  let events=r.ok?labelTeamEvents(parsed,school,sport,finalUrl):[];
  if(events.length&&aiTargetId)events=await attachOfficialHighlights(events,html,school,sport,finalUrl,now,env,aiTargetId);
  if(school.id==='kansas'&&sport==='Cross Country'&&!aiTargetId){
    // Future KU races use the same official two-document path in the feed and
    // the expanded view; a missing document stays explicitly partial.
    for(const event of events.filter(e=>isKansasCrossCountry(e)&&!e.kansas_results_verified))await attachOfficialHighlights(events,html,school,sport,finalUrl,now,env,event.id);
  }
  if(school.id==='kansas'&&sport==='Golf'&&!aiTargetId){
    for(const event of events.filter(kansasHandlers.hasReviewedGolf))await attachOfficialHighlights(events,html,school,sport,finalUrl,now,env,event.id);
  }
  // Oklahoma State's shared program page can hold no meets for this sport;
  // a Utah spring page can hold only a past season.
  const empty_schedule=r.ok&&!!schoolModule(school.id)?.isEmptySchedule?.(events,parsed);
  return{requested_url:url,url:finalUrl,http_status:r.status,ok:r.ok,source_cache:r.headers.get('x-sas-source')||null,upstream_status:Number(r.headers.get('x-sas-upstream-status'))||null,content_length:html.length,label_count:labels.length,event_count:events.length,empty_schedule,has_upcoming:/Upcoming Event:/i.test(parseable),has_completed:/Completed Event:/i.test(parseable),events};
}

function normalizedTeamName(value){return slug(value||'').replace(/-/g,' ')}
function scoreboardTeamMatchesSchool(team,school){
  // Full names only: the school's name, short name or a multi-letter alias
  // must equal ESPN's location, display name or short display name.
  // - No name prefix: "kansas" + anything took "Kansas State Wildcats" for KU,
  //   and Florida, Georgia, Iowa, Oklahoma, Oregon, Texas, Utah, Washington and
  //   others took their "State" neighbours.
  // - No abbreviations: ESPN's "OSU" is Ohio State and "MSU" Michigan State, so
  //   Oklahoma State's and Mississippi State's aliases matched them.
  // - No nickname alone ("Wildcats" is K-State, Kentucky, Arizona and more). A
  //   team whose ESPN name is its school (soccer's "Arizona") still matches.
  // - ESPN's boards carry no high or middle school: Manhattan High School
  //   ("Manhattan") never takes the Manhattan Jaspers (Oct 23).
  if(school?.level==='high-school'||school?.level==='middle-school')return false;
  const nicknames=new Set([team?.name===team?.location?null:team?.name,...(school.aliases||[]).filter(alias=>!/\s/.test(alias)&&/s$/i.test(alias))].map(normalizedTeamName).filter(Boolean));
  const wanted=[school.name,school.short_name,...(school.aliases||[])].filter(name=>!/^[A-Z&]{2,5}$/.test(String(name||''))||name===school.short_name).map(normalizedTeamName).filter(x=>x.length>=2&&!nicknames.has(x));
  const names=[team?.location,team?.displayName,team?.shortDisplayName].map(normalizedTeamName).filter(Boolean);
  return wanted.some(x=>names.includes(x));
}
// The team a board without a team label is for, from its ESPN path: the
// women's volleyball board or soccer's "usa.ncaa.w.1" is the "Women's" game.
function scoreboardBoardLabel(url){const path=String(url||'');return/\/womens-|\.w\.\d/.test(path)?"Women's":/\/mens-|\.m\.\d/.test(path)?"Men's":null}
function scoreboardDateKey(value){const n=Date.parse(value||'');return Number.isFinite(n)?new Date(n).toISOString().slice(0,10):''}
function scoreboardDates(now){
  return[-1,0,1].map(offset=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10).replaceAll('-','')});
}
// ESPN's CDN refused the app (HTTP 403, Oct 10, 2026) when every feed build
// read three days of every live board, game or not. The board is read only
// for the official schedule's unfinished games of yesterday and today (start
// times are the school's wall clock), plus the next day for a night game.
function scoreboardDatesForEvents(events,school,now){
  const day=864e5,today=schoolToday(now,school),dates=new Set(),key=value=>new Date(value).toISOString().slice(0,10).replaceAll('-','');
  for(const event of events){
    if(event.status==='Final')continue;
    const start=Date.parse(event.start_time||'');if(!Number.isFinite(start))continue;
    const date=Math.floor(start/day)*day;if(date!==today&&date!==today-day)continue;
    dates.add(key(date));if(new Date(start).getUTCHours()>=18)dates.add(key(date+day));
  }
  return[...dates];
}
// ESPN's college football and basketball scoreboards list only ~25 featured
// games for "limit=1000" (K-State at Cincinnati and Arizona at Washington State
// were missing on Sep 26; 12 of 53 men's basketball games on Mar 3, 2026).
// Every catalog school is FBS and Division I: ask for those groups.
function scoreboardQuery(provider){
  if(provider.query)return provider.query;
  if(provider.path==='football/college-football')return'groups=80&limit=300';
  if(/^basketball\/(?:mens|womens)-college-basketball$/.test(provider.path))return'groups=50&limit=300';
  return'limit=1000';
}
// Every sport ESPN publishes a live college board for reads it (user, Oct 8:
// "It should read any sport that has a live feed"; Kansas at K-State soccer
// stayed "Today" while live because only newer modules named a scoreboard).
// A school module's own list wins. These defaults are join-only: a score
// shows only on a game the official schedule lists that day, so a board for
// the other gender (lacrosse, hockey, water polo) or a team the app does not
// carry never adds a card.
const DEFAULT_SCOREBOARDS={
  Basketball:[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
  Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
  Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
  Baseball:[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
  Softball:[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}],
  Lacrosse:[{path:'lacrosse/mens-college-lacrosse',sourceName:"Live men's college lacrosse scoreboard"},{path:'lacrosse/womens-college-lacrosse',sourceName:"Live women's college lacrosse scoreboard"}],
  Hockey:[{path:'hockey/mens-college-hockey',sourceName:"Live men's college hockey scoreboard"},{path:'hockey/womens-college-hockey',sourceName:"Live women's college hockey scoreboard"}],
  'Field Hockey':[{path:'field-hockey/womens-college-field-hockey',sourceName:'Live college field hockey scoreboard'}],
  'Water Polo':[{path:'water-polo/mens-college-water-polo',sourceName:"Live men's college water polo scoreboard"},{path:'water-polo/womens-college-water-polo',sourceName:"Live women's college water polo scoreboard"}]
};
// Two soccer teams on one page (UCF): each board carries its team.
const COMBINED_SOCCER_SCOREBOARDS=[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}];
function liveScoreboardProviders(school,sport){
  const configured=schoolModule(school?.id)?.school.liveScoreboards?.[sport];
  if(configured?.length)return configured;
  if(sport==='Football')return[{path:'football/college-football',sourceName:'Live college football scoreboard'}];
  const defaults=sport==='Soccer'&&schoolCombinedSports(school).has('Soccer')?COMBINED_SOCCER_SCOREBOARDS:DEFAULT_SCOREBOARDS[sport]||[];
  return defaults.map(provider=>({...provider,joinOnly:true}));
}
function parseScoreboardPayload(payload,school,sport,provider,url,now){
  const found=[];
  for(const item of payload?.events||[]){
    const competition=item?.competitions?.[0],competitors=competition?.competitors||[];
    const ours=competitors.find(c=>scoreboardTeamMatchesSchool(c?.team,school));
    if(!ours)continue;
    const opponent=competitors.find(c=>c!==ours);if(!opponent)continue;
    const type=competition?.status?.type||item?.status?.type||{},state=String(type.state||'').toLowerCase();
    if(state!=='in'&&state!=='post'&&!type.completed)continue;
    // ESPN dates are true UTC; express them in the school's local wall clock.
    // Unconfirmed start times are published at Eastern midnight, so use only
    // that Eastern calendar day.
    const start=new Date(competition?.date||item?.date||now.toISOString()),timeValid=competition?.timeValid!==false,local=localWallClock(start,timeValid?schoolTimeZone(school):'America/New_York');
    const dateText=local.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}),timeText=timeValid?`${local.getUTCHours()%12||12}:${String(local.getUTCMinutes()).padStart(2,'0')} ${local.getUTCHours()>=12?'PM':'AM'}`:null;
    const status=state==='in'?'Live':'Final',detail=clean(type.shortDetail||type.detail||(status==='Live'?'Live now':'Final'));
    const event=makeEvent({school,sport,status,relation:ours.homeAway==='away'?'at':'vs',opponent:opponent.team?.shortDisplayName||opponent.team?.displayName||'Opponent',date:dateText,time:timeText,schoolScore:status==='Final'?ours.score:null,oppScore:status==='Final'?opponent.score:null,resultText:null,sourceUrl:url,now});
    if(status==='Live'){
      event.status='Live';event.priority_bucket='live';event.school_score=ours.score??null;event.opponent_score=opponent.score??null;event.headline=detail;event.recency_label=detail||'Live now';event.results=[];event.result_count=0;
      // Who has the ball (football): ESPN names the team id in possession and
      // the down and distance ("4th & 13 at KU 47"). Between a score and the
      // kickoff, and at breaks, ESPN names no team, so nothing is shown.
      // Everything else the board publishes (score by period, last play,
      // timeouts, win probability, leaders) goes on the live card too (user,
      // October 16: "update all live cards to show all the data").
      const live=espnLiveDetails(competition,{ours,opponent,sport});
      if(live.possession){event.possession=live.possession;event.down_distance=live.down_distance;event.red_zone=live.red_zone;}
      if(live.live_details)event.live_details=live.live_details;
      // The opponent's colors as ESPN publishes them, for its side of the card.
      const espnHex=v=>/^[0-9a-f]{6}$/i.test(v||'')?`#${v}`:null,oppPrimary=espnHex(opponent.team?.color);
      if(oppPrimary)event.opponent_colors={primary:oppPrimary,secondary:espnHex(opponent.team?.alternateColor)||oppPrimary};
    }else event.recency_label='Final';
    // Volleyball scores are sets won (0-0 during the first set). The live
    // headline adds the current set's points; a final reads like K-State's
    // official results ("W, 3-1").
    if(sport==='Volleyball'){
      const points=team=>(team?.linescores||[]).map(line=>Number(line?.value)).filter(Number.isFinite);
      const ourSets=points(ours),theirSets=points(opponent);
      // The live card shows recency_label beside the sets won, so both carry it.
      // While live, the big score shows the current set's points (sets won read
      // 0-0 for the whole first set and looked like no score); the status line
      // carries the sets: "1st Set · Sets 0-0". Finals keep sets won.
      if(status==='Live'&&ourSets.length&&ourSets.length===theirSets.length){
        event.headline=event.recency_label=`${detail} \u00b7 Sets ${ours.score??0}-${opponent.score??0}`;
        event.school_score=String(ourSets.at(-1));event.opponent_score=String(theirSets.at(-1));
      }
      const won=Number(ours.score),lost=Number(opponent.score);
      if(status==='Final'&&Number.isFinite(won)&&Number.isFinite(lost)&&won!==lost){const value=`${won>lost?'W':'L'}, ${won}-${lost}`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
    }
    // Scoreboard finals read like the official results, K-State's "W, 71-68",
    // so a final never replaces the official headline with a bare "71–68".
    if(status==='Final'&&sport!=='Volleyball'){
      const ourScore=Number(ours.score),theirScore=Number(opponent.score);
      if(Number.isFinite(ourScore)&&Number.isFinite(theirScore)){const value=`${ourScore>theirScore?'W':ourScore<theirScore?'L':'T'}, ${ourScore}-${theirScore}`;event.headline=value;event.results=[{label:'Result',value}];event.result_count=1;}
    }
    if(provider.team_label){event.team_label=provider.team_label;event.title=`${provider.team_label} · ${event.title}`;}
    event.source={name:provider.sourceName||'Live game scoreboard',url,updated_at:now.toISOString()};
    event.live_score_source=url;event.verification_state='live_scoreboard';event.source_count=1;
    if(provider.joinOnly)event.join_only=true;
    found.push(event);
  }
  // A doubleheader is the same opponent twice on one day (ESPN listed Baylor
  // at Kansas twice on Apr 10, 2026). Both games had one id, so the second was
  // lost; they become Game 1 and Game 2 in start order, as the official
  // schedules number them.
  const sameDay=new Map();
  for(const event of found){const key=`${event.team_label||''}|${slug(event.opponent||'')}|${scoreboardDateKey(event.start_time)}`;sameDay.set(key,[...(sameDay.get(key)||[]),event]);}
  for(const games of sameDay.values())if(games.length>1)games.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time))).forEach((event,i)=>{event.game_number=i+1;event.id=`${event.id}-game-${i+1}`;event.title=`${event.title} (Game ${i+1})`;});
  return mergeEvents([found]);
}
// Each read is recorded in `reads` (shown by /live/status), so a scoreboard
// that answers badly is visible instead of silently empty.
async function fetchLiveScoreboards(school,sport,now,reads=[],dates=scoreboardDates(now)){
  const found=[];
  for(const provider of liveScoreboardProviders(school,sport))for(const date of dates){
    const url=`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard?${scoreboardQuery(provider)}&dates=${date}`;
    const read={url,http_status:null,games:null,matched:0,error:null};reads.push(read);
    try{
      const response=await fetch(url,{headers:{'User-Agent':SCOREBOARD_USER_AGENT,'Accept':'application/json'},cf:{cacheTtl:15,cacheEverything:true}});
      read.http_status=response.status;
      if(!response.ok){read.server=response.headers.get('server');read.cache=response.headers.get('cf-cache-status')||response.headers.get('x-cache');read.body=(await response.text()).slice(0,160);}
      if(response.ok){const payload=await response.json();read.games=payload?.events?.length??0;const events=parseScoreboardPayload(payload,school,sport,provider,url,now);read.matched=events.length;found.push(...events);}
    }catch(error){read.error=error?.message||error?.name||'FetchError'}
  }
  return mergeEvents([found]);
}
// Every live game the app can name, from every level ESPN publishes a board
// for (user, October 28: home screen "favorites and then all events"; PR 2).
// Each board is read once for all schools, never once per school (ESPN
// refused per-school volume on Oct 10): college boards are matched to college
// catalog schools that sponsor the sport (scoreboardTeamMatchesSchool), pro
// boards to the league's own teams by ESPN abbreviation or id. A game names
// one team: the home side when it is in the catalog, else the away side.
// Boards out of season are not read. High and middle schools have no board.
const LIVE_NOW_COLLEGE_BOARDS=[
  {path:'football/college-football',sport:'Football'},
  ...Object.entries(DEFAULT_SCOREBOARDS).flatMap(([sport,boards])=>boards.map(board=>({path:board.path,sport,team_label:board.team_label||scoreboardBoardLabel(`/${board.path}/`)}))),
  {path:'soccer/usa.ncaa.m.1',sport:'Soccer',team_label:"Men's"}
].map(board=>({...board,level:'college'}));
function liveNowBoards(now=new Date()){
  const month=now.getUTCMonth()+1,pro=new Map();
  for(const school of schools){if(school.level!=='pro')continue;const config=proTeam(school.id);if(config?.kind==='espn-team'&&!pro.has(config.espn.path))pro.set(config.espn.path,{path:config.espn.path,sport:config.sport,level:'pro'});}
  return[...LIVE_NOW_COLLEGE_BOARDS,...pro.values()].filter(board=>inSeason(board.sport,month,board.level==='pro'));
}
function liveNowGames(boards,now=new Date()){
  const games=[],seen=new Set();
  const college=schools.filter(school=>(school.level||'college')==='college');
  const index=new Map();
  for(const school of college)for(const name of [school.name,school.short_name,...(school.aliases||[])]){const key=normalizedTeamName(name);if(key.length<2)continue;if(!index.has(key))index.set(key,[]);index.get(key).push(school);}
  const collegeMatch=(team,sport)=>{
    const found=new Set();
    for(const name of [team?.location,team?.displayName,team?.shortDisplayName])for(const school of index.get(normalizedTeamName(name))||[])found.add(school);
    return[...found].find(school=>(sponsoredSports[school.id]||school.sponsored_sports||[]).includes(sport)&&scoreboardTeamMatchesSchool(team,school))||null;
  };
  const proMatch=(team,path)=>schools.find(school=>{if(school.level!=='pro')return false;const config=proTeam(school.id);if(config?.kind!=='espn-team'||config.espn.path!==path)return false;return config.espn.id!=null?String(config.espn.id)===String(team?.id):String(config.espn.team||'').toLowerCase()===String(team?.abbreviation||'').toLowerCase();})||null;
  for(const {board,payload,url} of boards){
    for(const item of payload?.events||[]){
      const competition=item?.competitions?.[0],state=String(competition?.status?.type?.state||item?.status?.type?.state||'').toLowerCase();
      if(state!=='in'||seen.has(`${board.path}|${item.id}`))continue;
      const sides=[...(competition?.competitors||[])].sort((a,b)=>(a.homeAway==='home'?0:1)-(b.homeAway==='home'?0:1));
      let school=null;
      for(const side of sides){school=board.level==='pro'?proMatch(side.team,board.path):collegeMatch(side.team,board.sport);if(school)break;}
      if(!school)continue;
      seen.add(`${board.path}|${item.id}`);
      const provider={path:board.path,team_label:board.team_label||undefined,sourceName:'Live scoreboard'};
      for(const event of parseScoreboardPayload({events:[item]},school,board.sport,provider,url,now))games.push({...event,school:school.name,short_name:school.short_name||school.name,level:school.level||'college',espn_event_id:String(item.id),...(teamThemes[school.id]?{school_colors:{primary:teamThemes[school.id].primary,secondary:teamThemes[school.id].secondary}}:{})});
    }
  }
  return games;
}
// Meets Home shows to everyone (user, October 28: "Show it on Home even if
// not starred"): each AthleticLIVE meet the modules list, for every school it
// names, from a week before its day through the day after.
const FEATURED_MEET_DAYS=[7,1];
function featuredMeets(now=new Date()){
  const out=[],seen=new Set();
  for(const module of HIGH_SCHOOL_MODULES)for(const meet of module.meetPro?.athleticLive||[]){
    const day=Date.parse(`${meet.date}T00:00:00Z`);
    if(!(now.getTime()>=day-FEATURED_MEET_DAYS[0]*864e5&&now.getTime()<day+(FEATURED_MEET_DAYS[1]+1)*864e5))continue;
    for(const id of Object.keys(meet.schools||{})){const key=`${id}|${meet.sport}`;if(seen.has(key)||!catalogSchool(id))continue;seen.add(key);out.push({school_id:id,sport:meet.sport,name:meet.name,date:meet.date});}
  }
  return out;
}
async function liveNow(now=new Date()){
  const boards=liveNowBoards(now),reads=await Promise.all(boards.map(async board=>{
    const url=`${ESPN_SITE}${board.path}/scoreboard?${scoreboardQuery(board)}`;
    const payload=await readJson(url,30);
    return{board,payload,url,ok:Boolean(payload)};
  }));
  return{fetched_at:now.toISOString(),games:liveNowGames(reads.filter(read=>read.ok),now),featured:featuredMeets(now),boards:reads.map(read=>({path:read.board.path,sport:read.board.sport,ok:read.ok,events:read.payload?.events?.length??null}))};
}
function reconcileScoreboardEvents(scheduleEvents,scoreEvents,{keepUnjoined=false}={}){
  const events=scheduleEvents.slice(),joined=new Set();
  for(const score of scoreEvents){
    const day=scoreboardDateKey(score.start_time);
    // A default board carries no team; a school that labels its one team
    // (KU's soccer and volleyball read "Women's") takes that label.
    const labels=new Set(scheduleEvents.filter(event=>event.sport===score.sport).map(event=>event.team_label||null));
    // A module's own board without a label joins the same way (Sacred Heart
    // volleyball, Oct 27: its schedule reads "Women's", the board none, and
    // the game showed live and still upcoming). With both teams on the
    // schedule, the board's path names the team (Old Dominion soccer).
    const boardLabel=scoreboardBoardLabel(score.live_score_source);
    const label=score.team_label||(labels.size===1?[...labels][0]:labels.has(boardLabel)?boardLabel:null);
    const sameDay=index=>{const event=events[index];return index<scheduleEvents.length&&!joined.has(index)&&event.sport===score.sport&&scoreboardDateKey(event.start_time)===day&&(event.team_label||null)===label;};
    // A doubleheader game joins the official game with its number; any other
    // score joins the first official game that day no other score has taken.
    const indexes=events.map((event,index)=>index).filter(sameDay);
    const index=score.game_number?(indexes.find(index=>events[index].game_number===score.game_number)??indexes.find(index=>!events[index].game_number)??-1):(indexes[0]??-1);
    // A default board's score shows only on an official game (keepUnjoined:
    // the official page failed and the score is laid over the last good feed).
    if(index<0){if(!score.join_only||keepUnjoined)events.push(score);continue}
    joined.add(index);
    const official=events[index];
    events[index]={...official,status:score.status,priority_bucket:score.priority_bucket,school_score:score.school_score,opponent_score:score.opponent_score,headline:score.headline,recency_label:score.recency_label,last_verified_at:score.last_verified_at,freshness_seconds:0,verification_state:'official_schedule+live_scoreboard',source_count:2,live_score_source:score.live_score_source,possession:score.possession??null,down_distance:score.down_distance??null,red_zone:score.red_zone??null,live_details:score.live_details??null};
  }
  return events;
}
// A final whose only result is "Completed" (1,615 college rows at 260
// schools, Oct 29: tennis and swimming invitationals, golf, rowing) takes it
// from its official story: a golf team place, a dual's score, else the
// story's headline ("Spartan Men's Tennis Finishes Trip to Louisville
// Classic"). One with no story, result page or box score is not listed.
const isBareCompleted=event=>event.status==='Final'&&event.headline==='Completed'&&(event.results||[]).every(row=>row.value==='Completed'&&!row.participant);
function storyHeadline(raw,school){
  const meta=name=>decodeHtml((String(raw).match(new RegExp(`<meta\\b[^>]*(?:property|name)=["'](?:og|twitter):${name}["'][^>]*content=(["'])([\\s\\S]*?)\\1`,'i'))||[])[2]||'');
  let title=clean(meta('title')||decodeHtml((String(raw).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||''));
  if(!title)return null;
  // The site's name is cut: "... | Sun Devils", "WTEN | ... - SMC California
  // Athletics", "... - University at Buffalo", "... - Army West Point".
  const names=[school.name,school.short_name,...(school.aliases||[])].filter(Boolean);
  title=title.split(/\s+\|\s+/).sort((a,b)=>b.length-a.length)[0];
  const tail=title.match(/\s+[-–—]\s+([^-–—]+)$/);
  if(tail&&(/\b(?:Athletics?|Sports|University|College|West Point)\b/i.test(tail[1])||names.some(name=>tail[1].toLowerCase().includes(name.toLowerCase()))))title=title.slice(0,tail.index);
  title=clean(title);
  if(!title||title.length<12||names.some(name=>title.toLowerCase()===name.toLowerCase()))return null;
  return title;
}
function storyDualScore(text,school){
  const team=[school.name,school.short_name,...(school.aliases||[])].filter(Boolean).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const m=text.match(new RegExp(`\\b(?:${team})\\b[^.]{0,80}?\\b(defeats?|defeated|tops?|topped|beats?|beat|downs?|downed|falls?|fell|drops?|dropped)\\b[^.]{0,80}?\\b(\\d{2,3}(?:\\.\\d)?)\\s*[-–]\\s*(\\d{2,3}(?:\\.\\d)?)\\b`,'i'));
  if(!m)return null;
  const [a,b]=[Number(m[2]),Number(m[3])],won=!/^(?:fall|fell|drop)/i.test(m[1]);
  if(a===b)return null;
  return{outcome:won?'W':'L',mine:String(won?Math.max(a,b):Math.min(a,b)),theirs:String(won?Math.min(a,b):Math.max(a,b))};
}
async function completedFromStories(events,school){
  const team=`(?:${[school.name,school.short_name,...(school.aliases||[])].filter(Boolean).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}|(?:Men's |Women's )?(?:Golf|Team))`;
  await Promise.all(events.filter(event=>isBareCompleted(event)&&event.recap_url).map(async event=>{
    let raw=null;try{const response=await sourceFetch(event.recap_url,{headers:HEADERS,redirect:'follow',signal:AbortSignal.timeout(6500)});raw=response.ok?await response.text():null;}catch{}
    if(!raw||!isBareCompleted(event))return;
    // The expanded view's own check: a story that is not this event's is
    // dropped there (ASU's SMU Classic, Oct 29), so the card does not use it.
    let matched=false;try{matched=(schoolModule(event.school_id)?.matchesRecap||recapMatchesEvent)(raw,event,event.recap_url);}catch{}
    if(!matched){delete event.recap_url;delete event.recap_title;return;}
    const title=storyHeadline(raw,school);
    // A story of the other team ("Men's Tennis ..." for the women's event).
    const other=event.team_label==="Women's"?/\bMen['’]s\b/i:event.team_label==="Men's"?/\bWomen['’]s\b/i:null;
    const own=!(other&&title&&other.test(title)&&!/\b(?:Men['’]s (?:and|&) Women['’]s|Women['’]s (?:and|&) Men['’]s)\b/i.test(title));
    const place=own&&event.sport==='Golf'&&!/\bIndividuals?\b/.test(event.opponent||'')?golfStoryPlace(raw,{team,decode:decodeHtml}):null;
    const summary=decodeHtml((String(raw).match(/<meta\b[^>]*(?:property|name)=["'](?:og:)?description["'][^>]*content=(["'])([\s\S]*?)\1/i)||[])[2]||'').split(/(?<=\.)\s/)[0];
    const dual=own&&!place&&event.event_type==='DUAL'&&title?storyDualScore(`${title}. ${summary}`,school):null;
    if(place){event.headline=place;event.results=[{label:'Result',value:place}];}
    else if(dual){event.school_score=dual.mine;event.opponent_score=dual.theirs;event.headline=`${dual.outcome}, ${dual.mine}-${dual.theirs}`;event.results=[{label:'Result',value:event.headline}];}
    else if(own&&title){event.headline=title;event.results=[{label:'Recap',value:title}];}
    // The other team's story is not this event's.
    else if(!own){delete event.recap_url;delete event.recap_title;}
    event.result_count=event.results.length;
  }));
  return events.filter(event=>!(isBareCompleted(event)&&!event.recap_url&&!event.result_url&&!event.box_score_url));
}
async function fetchLive(schoolId,sport,env=null,aiTargetId=null){
  const school=catalogSchool(schoolId),now=new Date();
  if(!school)return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'School not found'};
  if(isHighSchool(school))return fetchHighSchool(school,sport,now,aiTargetId);
  if(isPro(school))return fetchPro(school,sport,now,aiTargetId);
  const urls=candidateUrls(school,sport),errors=[],successful=[];
  const scoreboardReads=[];
  // Candidate paths are fallbacks, not independent feeds. Stop after the first
  // usable official schedule instead of hammering every possible publisher URL.
  const combined=schoolCombinedSports(school).has(sport);
  let emptySchedule=null;
  for(const url of urls){
    if(combined&&successful.length&&teamLabelForSource(school,sport,url)==null)continue;
    try{
      const item=await fetchUrl(url,school,sport,now,env,aiTargetId);
      if(item.ok&&item.events.length){successful.push(item);if(!combined)break;continue}
      if(item.empty_schedule){emptySchedule??=item;continue}
      errors.push(`${item.url}: HTTP ${item.http_status}, labels ${item.label_count}, events ${item.event_count}`);
    }catch(error){errors.push(`${url}: ${error?.message||error?.name||'FetchError'}`)}
  }
  // When every official page failed, a scoreboard game alone is not a full
  // feed (see freshGroupedFeed).
  const officialFailed=!successful.length&&!emptySchedule;
  let events=mergeEvents(successful.map(x=>x.events));
  // Cross-country cards must use one global results contract. Enrich every
  // completed meet that already exposes an official result link before the
  // grouped feed is cached, so the summary count and cards match the modal.
  // Before the module's feed hook (Big Sky, Oct 21): a meet the schedule
  // publishes no result or story for is kept once TFRRS gives its results
  // (Idaho State's and Southern Utah's meets were dropped as "Completed").
  if(sport==='Cross Country')await Promise.all(events.filter(event=>event.status==='Final'&&(event.result_url||isKStateCrossCountry(event)||moduleCrossCountry(event))&&!isKansasCrossCountry(event)).map(event=>attachOfficialMeetResults(event)));
  // School modules finish their own sports (golf and tennis stories, archive
  // stories).
  const feedHook=schoolModule(school.id)?.feed;if(feedHook)events=await feedHook(events,sport);
  // One story for one tennis tournament (archive stories included), Sun Belt
  // Oct 22; a tournament left without one is not listed (K-State's rule).
  if(sport==='Tennis'){const had=new Set(events.filter(event=>event.recap_url));oneTournamentPerStory(events);events=events.filter(event=>!(had.has(event)&&!event.recap_url&&event.event_type==='MEET'&&event.status==='Final'));}
  // A final that still reads only "Completed" (Oct 29, user: "fix the ones
  // that just say completed"): its story gives the result, else it is not
  // listed (K-State's rule).
  events=await completedFromStories(events,school);
  // The independent scoreboard: for the official schedule's games under way,
  // or for the last three days when the official page failed (a stale or
  // failed school page must not suppress a live football/basketball score).
  const scoreboardDays=officialFailed?scoreboardDates(now):scoreboardDatesForEvents(events,school,now);
  const scoreboard=scoreboardDays.length?await fetchLiveScoreboards(school,sport,now,scoreboardReads,scoreboardDays):[];
  if(scoreboard.length){
    events=reconcileScoreboardEvents(events,scoreboard,{keepUnjoined:officialFailed});
    if(scoreboard.length)successful.push({url:scoreboard[0].live_score_source,events:scoreboard});
  }
  if(events.length)return{events,source_url:successful[0]?.url||null,source_urls:[...new Set(successful.map(x=>x.url))],fetched_at:now.toISOString(),live_source_used:true,error:null,official_failed:officialFailed,scoreboard_reads:scoreboardReads};
  // The official page was read and publishes no events for this sport yet.
  if(emptySchedule)return{events:[],source_url:emptySchedule.url,source_urls:[emptySchedule.url],fetched_at:now.toISOString(),live_source_used:true,error:null};
  // The official page was read and every event on it was dropped by the
  // listing rules (George Mason tennis, Oct 23: six past tournaments, none
  // with a story): an empty schedule, not a failed source.
  if(successful.length)return{events:[],source_url:successful[0].url,source_urls:[...new Set(successful.map(x=>x.url))],fetched_at:now.toISOString(),live_source_used:true,error:null};
  return{events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:errors.slice(-6).join('; ')||'No live source available'};
}
function feedCacheKey(url,school,sport){const key=new URL('/__sas_cache/feed',url.origin);key.searchParams.set('school',school);key.searchParams.set('sport',sport);key.searchParams.set('feed_cache',VERSION);return new Request(key.toString(),{method:'GET'});}
// The last successfully built feed, kept for a week. It is served only when
// asked for (cached=1) or when a rebuild fails, always labeled with its age,
// so a Worker CPU-limit failure (Cloudflare 1102) never blanks a sport that
// loaded recently at this Cloudflare location.
const LAST_GOOD_MS=7*24*60*60*1000;
// Saved copies outlive a deploy (Oct 21: keyed by VERSION, every merge
// emptied them, and a school-site outage right after one answered 502).
// Raise FEED_COPY_FORMAT only when the grouped feed's shape changes so an
// older copy could not be drawn.
const FEED_COPY_FORMAT='1';
function lastGoodFeedKey(url,school,sport){const key=new URL('/__sas_cache/feed-last-good',url.origin);key.searchParams.set('school',school);key.searchParams.set('sport',sport);key.searchParams.set('feed_copy',FEED_COPY_FORMAT);return new Request(key.toString(),{method:'GET'});}
// A global saved copy (KV, shared by every Cloudflare location) for schools
// whose official site refuses some locations: gamecocksonline.com answers
// Paris with 403 (Oct 8). A location that cannot rebuild and has no copy of
// its own serves the last feed another location built. Written at most once
// an hour per sport (KV writes are metered); read only when a rebuild fails.
const GLOBAL_COPY_WRITE_MS=60*60*1000;
// Each host keeps its own copy (a branch preview never replaces
// production's); a preview with none of its own reads production's.
const copyScope=url=>url.hostname===PRODUCTION_HOST?'prod':url.hostname;
const globalCopyKey=(scope,school,sport)=>`feed:v2:${scope}|${school}|${sport}|${FEED_COPY_FORMAT}`;
// The Manhattan (USD 383) school sites answer Cloudflare's European
// locations with 520 (Stockholm, Warsaw; Oct 16) and Newark with 200: their
// feeds keep the global copy too.
const usesGlobalCopy=school=>Boolean(schoolModule(school)?.school.globalSavedCopy||highSchoolModule(school)?.globalSavedCopy);
async function saveGlobalCopy(env,url,school,sport,body,fetchedAt){
  if(!env?.HIGHLIGHTS||!usesGlobalCopy(school))return;
  try{
    const key=globalCopyKey(copyScope(url),school,sport);
    // Within the hour a copy is rewritten only when its number of events
    // changed (Oct 21: Manhattan golf's results from Prep.Golf waited behind an
    // empty copy saved before them, now that copies outlive a deploy).
    let events=null;try{events=JSON.parse(body).reduce((n,g)=>n+['live','results','upcoming','other'].reduce((m,k)=>m+(g[k]?.length||0),0),0)}catch{}
    const {metadata}=await env.HIGHLIGHTS.getWithMetadata(key,'text');
    if(Date.now()-Date.parse(metadata?.fetched_at||'')<GLOBAL_COPY_WRITE_MS&&metadata?.events===events)return;
    await env.HIGHLIGHTS.put(key,body,{expirationTtl:Math.floor(LAST_GOOD_MS/1000),metadata:{fetched_at:fetchedAt,events}});
  }catch{}
}
async function globalCopy(env,url,school,sport){
  if(!env?.HIGHLIGHTS||!usesGlobalCopy(school))return null;
  for(const scope of [...new Set([copyScope(url),'prod'])]){
    try{
      const {value,metadata}=await env.HIGHLIGHTS.getWithMetadata(globalCopyKey(scope,school,sport),'text');
      if(!value||!metadata?.fetched_at)continue;
      const response=new Response(value,{headers:{'content-type':'application/json; charset=utf-8','x-sas-fetched-at':metadata.fetched_at,'cache-control':'no-store'}});
      if(cachedAge(response)<=LAST_GOOD_MS)return response;
    }catch{}
  }
  return null;
}
function sponsoredSportError(school,sport){const allowed=sponsoredSports[school];return allowed&&!allowed.includes(sport)?json({detail:{message:`${school} does not sponsor ${sport}`,school,sport}},422):null;}
function cachedAge(response){const saved=Date.parse(response.headers.get('x-sas-fetched-at')||'');return Number.isFinite(saved)?Date.now()-saved:Infinity;}
function cacheResponse(response,state){const copy=new Response(response.body,response);copy.headers.set('x-sas-cache',state);copy.headers.set('access-control-expose-headers','x-sas-cache,x-sas-fetched-at');return copy;}
async function freshGroupedFeed(url,school,sport,env,cache,key){
  const result=await fetchLive(school,sport,env);
  if(!result.events.length&&!result.live_source_used)return null;
  let events=result.events;
  // A build missing its scores source (a high school's MaxPreps read failed,
  // Oct 16: Manhattan football read 0 of 7 results) yields to the last good
  // copy; with none, it is shown but never saved as the last good copy.
  if(result.scores_missing){
    const saved=await cache.match(lastGoodFeedKey(url,school,sport));
    if((saved&&cachedAge(saved)<=LAST_GOOD_MS)||await globalCopy(env,url,school,sport))return null;
  }
  // The official page failed but a live scoreboard answered (a one-off
  // kstatesports.com failure during K-State vs BYU, Oct 1): lay the live score
  // over the last good full feed instead of replacing the whole schedule with
  // one game, and never save that partial feed as the last good copy.
  if(result.official_failed){
    const saved=await cache.match(lastGoodFeedKey(url,school,sport));
    if(!saved||cachedAge(saved)>LAST_GOOD_MS)return null;
    const previous=(await saved.json()).flatMap(group=>[...(group.live||[]),...(group.results||[]),...(group.upcoming||[]),...(group.other||[])]);
    events=reconcileScoreboardEvents(previous.map(event=>event.status==='Live'?{...event,status:'Today'}:event),result.events);
  }
  const groups=groupEvents(events),response=json(groups),stored=new Response(response.body,response);
  if(groups.some(group=>group.live?.length))stored.headers.set('x-sas-live','1');
  stored.headers.set('cache-control',`public, max-age=${Math.floor(FEED_STALE_MS/1000)}`);
  stored.headers.set('x-sas-fetched-at',result.fetched_at);
  if(result.official_failed||result.scores_missing){await cache.put(key,stored.clone());return stored;}
  const lastGood=stored.clone();lastGood.headers.set('cache-control',`public, max-age=${Math.floor(LAST_GOOD_MS/1000)}`);
  const body=usesGlobalCopy(school)?await stored.clone().text():null;
  await Promise.all([cache.put(key,stored.clone()),cache.put(lastGoodFeedKey(url,school,sport),lastGood),body&&saveGlobalCopy(env,url,school,sport,body,result.fetched_at)]);return stored;
}
async function diagnostic(schoolId,sport){const school=catalogSchool(schoolId),now=new Date();if(!school)return{version:VERSION,school:schoolId,sport,error:'School not found'};const rows=[];for(const url of candidateUrls(school,sport)){try{const r=await fetchUrl(url,school,sport,now);rows.push({requested_url:r.requested_url,url:r.url,http_status:r.http_status,ok:r.ok,content_length:r.content_length,label_count:r.label_count,event_count:r.event_count,has_upcoming:r.has_upcoming,has_completed:r.has_completed,source_cache:r.source_cache,upstream_status:r.upstream_status,empty_schedule:Boolean(r.empty_schedule)});}catch(e){rows.push({requested_url:url,error:e?.message||e?.name||'FetchError'});}}return{version:VERSION,school:schoolId,sport,checked_at:now.toISOString(),sources:rows};}
async function verification(schoolId,sport){const result=await fetchLive(schoolId,sport),g=groupEvents(result.events)[0]||null;return{version:VERSION,school:schoolId,sport,verified_at:result.fetched_at,live_source_used:result.live_source_used,source_urls:result.source_urls,error:result.error,counts:g?{live:g.live.length,results:g.results.length,upcoming:g.upcoming.length,other:g.other.length}:{live:0,results:0,upcoming:0,other:0},latest_result:g?.results?.[0]||null,next_event:g?.upcoming?.[0]||null};}

// Private source fetch for development (user-approved, October 2). The
// development sandbox's network is refused by some schools' bot defense; the
// live app is not. This returns the raw official page exactly as the app
// downloads it (same identity, robots.txt rules, caching and backoff), only:
//   - with the Worker secret SOURCE_FETCH_KEY as a bearer token (no secret
//     set: the route does not exist);
//   - for https pages on a catalog school's official athletics site or TFRRS,
//     which the app already reads, including after redirects.
const SOURCE_EXTRA_HOSTS=['tfrrs.org','maxpreps.com'];
// The bundled list, then the catalog's host index (catalog_hosts in D1).
async function sourceHostAllowed(hostname){
  const host=String(hostname||'').toLowerCase().replace(/^www\./,'');
  if(SOURCE_EXTRA_HOSTS.includes(host)||schools.some(s=>{try{return new URL(s.athletics_url).hostname.toLowerCase().replace(/^www\./,'')===host}catch{return false}}))return true;
  const db=await catalogD1();
  if(db){try{return await catalogHostKnown(db,host)}catch{}}
  return false;
}
async function sameSecret(given,expected){
  // Compare digests so the check takes the same time for any wrong key.
  const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))));
  const [a,b]=await Promise.all([digest(given),digest(expected)]);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
async function privateSource(request,env){
  const secret=env?.SOURCE_FETCH_KEY;
  if(!secret)return json({detail:'Not found'},404);
  const given=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!given||!(await sameSecret(given,secret)))return json({detail:'Unauthorized'},401);
  let target;try{target=new URL(new URL(request.url).searchParams.get('url')||'');}catch{return json({detail:'url is required'},400);}
  if(target.protocol!=='https:'||!(await sourceHostAllowed(target.hostname)))return json({detail:'Only official athletics pages the app reads are allowed'},400);
  // A fetch that throws is reported, not a Worker exception (txst.com, Oct
  // 19: Cloudflare 1101 with no reason).
  let response;try{response=await sourceFetch(target.href);}catch(error){return json({detail:`The official page could not be read: ${String(error?.message||error).slice(0,300)}`},502);}
  const finalUrl=response.url||target.href;
  try{if(!(await sourceHostAllowed(new URL(finalUrl).hostname)))return json({detail:'The page redirected outside the official athletics sites'},502);}catch{}
  const headers=new Headers({'cache-control':'no-store','x-robots-tag':'noindex','x-sas-final-url':finalUrl,'x-sas-upstream-status':String(response.status)});
  for(const name of['content-type','x-sas-source'])if(response.headers.get(name))headers.set(name,response.headers.get(name));
  return new Response(await response.arrayBuffer(),{status:response.status,headers});
}

// Verified finished events are kept for 30 days in Workers KV (one copy for
// every Cloudflare location), so each final's highlights are written by the AI
// once, not on every open. Finals do not change; the copy expires so
// corrections still arrive. Unverified answers (an AI timeout) are never kept.
const HIGHLIGHT_STORE_TTL=30*24*60*60;
// A school module may carry a highlight revision: raising it retires that
// school's stored finals after a change to how they are written (Baylor's
// cross country highlights went from two lines to four).
// Pro finals saved before the box-score and race-table layouts (4.98.2) are
// rebuilt once.
const highlightStoreKey=(school,sport,eventId)=>`v1:${school}|${sport}|${eventId}${schoolModule(school)?.school.highlightRevision?`|r${schoolModule(school).school.highlightRevision}`:''}${proTeam(school)?'|box2':''}`;
function isVerifiedFinal(event){return Boolean(event&&event.status==='Final'&&event.id&&(event.highlights_verified||event.meet_results_verified)&&(event.highlights||[]).length)}
async function storedHighlights(env,key){
  if(!env?.HIGHLIGHTS)return null;
  try{const event=await env.HIGHLIGHTS.get(key,'json');return isVerifiedFinal(event)?event:null;}catch{return null}
}
function storeHighlights(env,ctx,key,event){
  if(!env?.HIGHLIGHTS||!isVerifiedFinal(event))return false;
  const write=env.HIGHLIGHTS.put(key,JSON.stringify(event),{expirationTtl:HIGHLIGHT_STORE_TTL}).catch(()=>{});
  ctx?.waitUntil?ctx.waitUntil(write):write;
  return true;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);sourceCacheOrigin=url.origin;requestCatalog={env,url};
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/web'){const assetRequest=url.pathname==='/web'?new Request(new URL('/index.html',url),request):request;const response=await env.ASSETS.fetch(assetRequest),headers=new Headers(response.headers);headers.set('cache-control','no-store, no-cache, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
    // School-entered live scores (scorer app, TV scoreboard, public live cards).
    if(url.pathname.startsWith('/api/score/'))return handleLiveScoring(request,env,url);
    // A request naming a school has its catalog entry loaded first.
    if((url.pathname.startsWith('/live/')||url.pathname.startsWith('/api/'))&&url.searchParams.get('school'))await loadCatalogEntries(env,url,[url.searchParams.get('school')]);
    if(url.pathname==='/api/status'){const {store,revision}=await catalogStore(env,url);let count=schools.length;if(store.kind==='d1')try{count=Number((await env.CATALOG_DB.prepare(`SELECT value FROM catalog_meta WHERE key='records'`).first())?.value)||count}catch{}return json({name:'SAS Sports API',version:VERSION,mode:'cloudflare-worker-live',web_live_mode:true,school_catalog_count:count,catalog:{source:store.kind,revision},web_path:'/'});}
    if(url.pathname==='/catalog/menu')return catalogAnswer(env,url,store=>catalogMenu(store,{level:url.searchParams.get('level'),group:url.searchParams.get('group'),middle:url.searchParams.get('middle')}));
    if(url.pathname==='/catalog/entries')return catalogAnswer(env,url,store=>catalogEntries(store,url.searchParams.get('ids')));
    if(url.pathname==='/schools'){const listDb=await catalogD1();let list=listDb?await catalogAllRecords(listDb).catch(()=>schools):schools;const q=(url.searchParams.get('q')||'').toLowerCase(),conference=url.searchParams.get('conference'),state=url.searchParams.get('state');if(q)list=list.filter(s=>[s.id,s.name,s.short_name,...(s.aliases||[])].join(' ').toLowerCase().includes(q));if(conference)list=list.filter(s=>s.conference.toLowerCase()===conference.toLowerCase());if(state)list=list.filter(s=>s.state.toLowerCase()===state.toLowerCase());return json(list.map(s=>({...s,time_zone:schoolTimeZone(s),sponsored_sports:sponsoredSports[s.id]||null})));}
    if(url.pathname==='/api/source')return privateSource(request,env);
    if(url.pathname==='/api/diagnostic'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await diagnostic(school,sport));}
    if(url.pathname==='/api/verify'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);return json(await verification(school,sport));}
    if(url.pathname==='/live/athletes'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');
      if(!school||!sport)return json({detail:'school and sport are required'},400);
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
      // High school athletes are minors: none are featured (user, October 9).
      if(isHighSchool(catalogSchool(school))||isPro(catalogSchool(school)))return json([]);
      // The key carries the sport's pinned athletes too: a build that adds a
      // pin must not serve the list cached before it (same version, 6 h).
      const pins=[...VERIFIED_TEAM_TAG_INSTAGRAM.keys()].filter(key=>key.startsWith(`${school}|${sport}|`)).sort().join(',');
      let pinHash=0;for(const c of pins)pinHash=(pinHash*31+c.charCodeAt(0))>>>0;
      const cache=caches.default,versionedUrl=new URL(url);versionedUrl.searchParams.set('athlete_cache',VERSION);
      if(pins)versionedUrl.searchParams.set('athlete_pins',pinHash.toString(36));
      const cacheKey=new Request(versionedUrl.toString(),{method:'GET'});
      const cached=await cache.match(cacheKey);if(cached)return cached;
      const athletes=await featuredAthletes(school,sport),response=json(athletes),stored=new Response(response.body,response);
      const complete=athletes.length===3&&athletes.every(a=>a.image_url);
      stored.headers.set('cache-control',`public, max-age=${complete?21600:300}`);
      if(athletes.length)await cache.put(cacheKey,stored.clone());return stored;
    }
    if(url.pathname==='/live/highlights'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport'),eventId=url.searchParams.get('event_id');
      if(!school||!sport||!eventId)return json({detail:'school, sport and event_id are required'},400);
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
      const key=highlightStoreKey(school,sport,eventId),kept=await storedHighlights(env,key);
      if(kept&&kept.id===eventId){const response=json(kept),stored=new Response(response.body,response);stored.headers.set('cache-control','no-store, no-cache, must-revalidate');stored.headers.set('x-sas-highlights','stored');return stored;}
      const result=await fetchLive(school,sport,env,eventId),event=result.events.find(e=>e.id===eventId);
      if(!event)return json({detail:'Event not found'},404);
      storeHighlights(env,ctx,key,event);
      const response=json(event),stored=new Response(response.body,response);
      stored.headers.set('x-sas-highlights','live');
      // Highlights are event-specific; browsers must not keep them (the app's
      // own device cache and the store above handle reuse).
      stored.headers.set('cache-control','no-store, no-cache, must-revalidate');
      return stored;
    }
    // Every live game, shared by every visitor for a minute at each location.
    if(url.pathname==='/live/now'){
      const cache=caches.default,key=new Request(new URL(`/__sas_cache/live-now?v=${VERSION}`,url.origin).toString());
      const cached=await cache.match(key);if(cached)return cached;
      const response=json(await liveNow(new Date()));
      response.headers.set('cache-control','public, max-age=60');
      ctx.waitUntil(cache.put(key,response.clone()));
      return response;
    }
    if(url.pathname==='/live/feed/grouped'){
      const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);
      const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;
      const cache=caches.default,key=feedCacheKey(url,school,sport),cached=await cache.match(key),force=url.searchParams.get('refresh')==='1';
      // A saved copy only, never a rebuild: cheap enough to answer when the
      // live rebuild just failed.
      if(url.searchParams.get('cached')==='1'){
        const saved=cached||await cache.match(lastGoodFeedKey(url,school,sport));
        if(saved&&cachedAge(saved)<=LAST_GOOD_MS)return cacheResponse(saved,'saved');
        const shared=await globalCopy(env,url,school,sport);if(shared)return cacheResponse(shared,'saved-global');
        return json({detail:{message:'No saved schedule is available',school,sport}},404);
      }
      if(cached&&!force){
        const age=cachedAge(cached);
        if(age<=(cached.headers.get('x-sas-live')==='1'?LIVE_FEED_FRESH_MS:FEED_FRESH_MS))return cacheResponse(cached,'fresh');
        if(age<=FEED_SERVE_STALE_MS){ctx?.waitUntil(freshGroupedFeed(url,school,sport,env,cache,key).catch(()=>null));return cacheResponse(cached,'stale-refreshing')}
      }
      const fresh=await freshGroupedFeed(url,school,sport,env,cache,key);
      if(fresh)return cacheResponse(fresh,'live');
      if(cached&&cachedAge(cached)<=FEED_STALE_MS)return cacheResponse(cached,'stale-fallback');
      const lastGood=await cache.match(lastGoodFeedKey(url,school,sport));
      if(lastGood&&cachedAge(lastGood)<=LAST_GOOD_MS)return cacheResponse(lastGood,'saved');
      const shared=await globalCopy(env,url,school,sport);if(shared)return cacheResponse(shared,'saved-global');
      return json({detail:{message:'Live source returned no usable events',fetched_at:new Date().toISOString(),error:'All official source candidates failed and no verified cache is available'}},502);
    }
    if(url.pathname==='/live/status'){const school=url.searchParams.get('school'),sport=url.searchParams.get('sport');if(!school||!sport)return json({detail:'school and sport are required'},400);const result=await fetchLive(school,sport);return json({school,sport,live_source_used:result.live_source_used,source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,event_count:result.events.length,error:result.error,scoreboard_reads:result.scoreboard_reads||[]});}
    return env.ASSETS.fetch(request);
  }
};
