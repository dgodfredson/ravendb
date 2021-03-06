import viewModelBase = require("viewmodels/viewModelBase");
import shell = require("viewmodels/shell");
import license = require("models/auth/licenseModel");
import registration = require("viewmodels/shell/registration");
import buildInfo = require("models/resources/buildInfo");
import generalUtils = require("common/generalUtils");
import accessManager = require("common/shell/accessManager");
import forceLicenseUpdateCommand = require("commands/licensing/forceLicenseUpdateCommand");
import getLatestVersionInfoCommand = require("commands/version/getLatestVersionInfoCommand");
import getLicenseConfigurationSettingsCommand = require("commands/licensing/getLicenseConfigurationSettingsCommand");

class about extends viewModelBase {

    accessManager = accessManager.default.aboutView;
    licenseCssClass = license.licenseCssClass;
    supportCssClass = license.supportCssClass;
    
    supportLabel = license.supportLabel;
    supportTableCssClass = license.supportTableCssClass;
    
    clientVersion = shell.clientVersion;
    serverVersion = buildInfo.serverBuildVersion;

    developerLicense = license.developerLicense;

    static latestVersion = ko.observable<Raven.Server.ServerWide.BackgroundTasks.LatestVersionCheck.VersionInfo>();
    currentServerVersion = ko.pureComputed(() => this.serverVersion() ? this.serverVersion().FullVersion : "");   
    
    isNewVersionAvailable = ko.pureComputed(() => {
        const latestVersionInfo = about.latestVersion();
        if (!latestVersionInfo) {
            return false;
        }

        const serverVersion = this.serverVersion();
        if (!serverVersion) {
            return false;
        }

        const isDevBuildNumber = (num: number) => num >= 40 && num < 50;

        return !isDevBuildNumber(latestVersionInfo.BuildNumber) &&
            latestVersionInfo.BuildNumber > serverVersion.BuildVersion;
    });

    newVersionAvailableHtml = ko.pureComputed(() => {
        if (this.isNewVersionAvailable()) {
            return `New version available<br/> <span class="nobr">${ about.latestVersion().Version }</span>`;
        } else {
            return `You are using the latest version`;
        }
    });
    
    latestVersionWhatsNewUrl = ko.pureComputed(() => 
        `https://ravendb.net/whats-new?buildNumber=${ about.latestVersion().BuildNumber }`);

    maxClusterSize  = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        return licenseStatus ? licenseStatus.MaxClusterSize : 1;
    });
    
    maxCores = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        return licenseStatus ? licenseStatus.MaxCores : 3;
    });
    
    maxMemory = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        return licenseStatus ? licenseStatus.MaxMemory : 6;
    });
    
    canUpgradeSupport = ko.pureComputed(() => {
        const support = license.supportCoverage();
        if (!support || !support.Status) {
            return true;
        }
        
        return support.Status !== "ProductionSupport";
    });

    spinners = {
        forceLicenseUpdate: ko.observable<boolean>(false),
        renewLicense: ko.observable<boolean>(false),
        latestVersionUpdates: ko.observable<boolean>(false)
    };

    expiresText = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        if (!licenseStatus || !licenseStatus.Expiration) {
            return null;
        }

        return licenseStatus.IsIsv ? "Updates Expiration" : "Expires";
    });

    formattedExpiration = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        if (!licenseStatus || !licenseStatus.Expiration) {
            return null;
        }

        const dateFormat = "YYYY MMMM Do";
        const expiration = moment(licenseStatus.Expiration);
        const now = moment();
        const nextMonth = moment().add(1, 'month');
        if (now.isBefore(expiration)) {
            const relativeDurationClass = nextMonth.isBefore(expiration) ? "" : "text-warning";
            
            const fromDuration = generalUtils.formatDurationByDate(expiration, true);
            return `${expiration.format(dateFormat)} <br /><small class="${relativeDurationClass}">(${fromDuration})</small>`;
        }

        const expiredClass = licenseStatus.Expired ? "text-danger" : "";
        const duration = generalUtils.formatDurationByDate(expiration, true);
        return `${expiration.format(dateFormat)} <br /><Small class="${expiredClass}">(${duration} ago)</Small>`;
    });

    licenseType = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        return !licenseStatus ? "None" : licenseStatus.Type;
    });

    licenseTypeText = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        if (!licenseStatus || licenseStatus.Type === "None") {
            return "No license - AGPLv3 Restrictions Applied";
        }

        let licenseType = licenseStatus.Type;
        if (licenseType === "Invalid") {
            return "Invalid license";
        }

        if (licenseStatus.IsCloud) {
            licenseType += " (Cloud)";
        }

        if (licenseStatus.IsIsv) {
            licenseType += " (ISV)";
        }

        return licenseType;
    });

    hasLicense = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        return licenseStatus && licenseStatus.Type !== "None";
    });

    shortDescription = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        const shortDescription = license.licenseShortDescription();
        if (!licenseStatus || !shortDescription) {
            return null;
        }

        return shortDescription;
    });

    licenseId = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        const licenseId = license.licenseId();
        if (!licenseStatus || !licenseId) {
            return null;
        }

        return licenseId;
    });
    
    licensedTo = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        if (!licenseStatus) {
            return null;
        }

        return licenseStatus.LicensedTo;
    });

    registered = ko.pureComputed(() => {
        const licenseStatus = license.licenseStatus();
        if (!licenseStatus) {
            return false;
        }

        return licenseStatus.Type !== "None" && licenseStatus.Type !== "Invalid";
    });
    
    canRenewLicense = ko.pureComputed(() => {
        return this.accessManager.canRenewLicense &&
               (this.licenseType() === 'Developer' ||  this.licenseType() === 'Community');
    });

    canForceUpdate = ko.pureComputed(() => {
        return this.accessManager.canForceUpdate  &&
               this.licenseType() !== 'Developer' &&
               this.licenseType() !== 'Community';
    });
    
    licenseAttribute(name: keyof Raven.Server.Commercial.LicenseStatus) {
        return ko.pureComputed(() => {
           const licenseStatus = license.licenseStatus();
           if (licenseStatus) {
               return licenseStatus[name] ? "icon-checkmark" : "icon-cancel";
           }
           return "icon-cancel";
        });
    }

    isRenewLicenseEnabled = ko.observable<boolean>(false);
    isActivateLicenseEnabled = ko.observable<boolean>(false);
    isForceUpdateEnabled = ko.observable<boolean>(false);

    register() {
        registration.showRegistrationDialog(license.licenseStatus(), false, true);
    }

    private getLicenseConfigurationSettings() {
        return new getLicenseConfigurationSettingsCommand()
            .execute()
            .done((result: Raven.Server.Config.Categories.LicenseConfiguration) => {
                this.isActivateLicenseEnabled(result.CanActivate);
                this.isRenewLicenseEnabled(result.CanRenew);
                this.isForceUpdateEnabled(result.CanForceUpdate);
            });
    }
    
    private pullLatestVersionInfo() {
        this.spinners.latestVersionUpdates(true);
        return new getLatestVersionInfoCommand()
            .execute()
            .done(versionInfo => {
                if (versionInfo && versionInfo.Version) {
                    about.latestVersion(versionInfo);
                }
            })
            .always(() => this.spinners.latestVersionUpdates(false));
    }

    refreshLatestVersionInfo() {
        this.spinners.latestVersionUpdates(true);
        const cmd = new getLatestVersionInfoCommand(true);
        cmd.execute()
            .done(versionInfo => {
                if (versionInfo && versionInfo.Version) {
                    about.latestVersion(versionInfo);
                }
            })
            .always(() => this.spinners.latestVersionUpdates(false));
    }

    openLatestVersionDownload() {
        window.open("https://ravendb.net/downloads", "_blank");
    }

    forceLicenseUpdate() {
        this.confirmationMessage(
                "Force License Update",
                "Are you sure that you want to force license update?")
            .done(can => {
                if (!can) {
                    return;
                }

                this.spinners.forceLicenseUpdate(true);
                new forceLicenseUpdateCommand().execute()
                    .done(() => {
                        license.fetchLicenseStatus()
                            .done(() => license.fetchSupportCoverage());
                    })
                    .always(() => this.spinners.forceLicenseUpdate(false));
            });
    }

    renewLicense() {
        registration.showRegistrationDialog(license.licenseStatus(), false, true, true);
    }

    openFeedbackForm() {
        shell.openFeedbackForm();
    }

    activate(args: any) {
        super.activate(args, { shell: true });
        return $.when<any>(this.getLicenseConfigurationSettings(), this.pullLatestVersionInfo());
    }
}

export = about;
