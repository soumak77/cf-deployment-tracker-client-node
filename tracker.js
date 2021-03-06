// Licensed under the Apache 2.0 License. See footer for details.

'use strict';

var restler = require('restler'),
    path = require('path');

function track(config) {
    config = config || {};
    config.packagePath = config.packagePath || path.dirname(module.parent.filename);
    var pkg = require(path.join(config.packagePath, 'package.json')),
        vcapApplication,
        vcapServices;

    if (process.env.VCAP_APPLICATION) {
        vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);
    }

    if (vcapApplication) {
        var event = {
            date_sent: new Date().toJSON()
        };
        if (pkg.version) {
            event.code_version = pkg.version;
        }
        if (pkg.repository && pkg.repository.url) {
            event.repository_url = pkg.repository.url;
        }
        if (vcapApplication.application_name) {
            event.application_name = vcapApplication.application_name;
        }
        if (vcapApplication.space_id) {
            event.space_id = vcapApplication.space_id;
        }
        if (vcapApplication.application_version) {
            event.application_version = vcapApplication.application_version;
        }
        if (vcapApplication.application_uris) {
            event.application_uris = vcapApplication.application_uris;
        }
        if (process.env.VCAP_SERVICES) {
            // refer to http://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html#VCAP-SERVICES
            vcapServices =  JSON.parse(process.env.VCAP_SERVICES);
            if(Object.keys(vcapServices).length > 0) {
                event.bound_vcap_services = {};
                // for each bound service count the number of instances and identify used plans
                Object.keys(vcapServices).forEach(function(service_label) {
                    event.bound_vcap_services[service_label] = {
                                                                 'count': vcapServices[service_label].length,   // number of service_label instances
                                                                 'plans': []                                    // (optional) plan information for service_label
                                                               };
                    vcapServices[service_label].forEach(function (serviceInstance) {
                        if(serviceInstance.hasOwnProperty('plan')) {
                            event.bound_vcap_services[service_label].plans.push(serviceInstance.plan);
                        }
                    });

                    // Keep plans property only if at least one plan is associated with this service
                    if(event.bound_vcap_services[service_label].plans.length === 0) {
                        delete event.bound_vcap_services[service_label].plans;
                    }
                });
            }
        }
        event.runtime = 'nodejs';

        var url = 'https://deployment-tracker.mybluemix.net/api/v1/track';
        restler.postJson(url, event).on('complete', function (data) {
            console.log('Uploaded stats', data);
        });
    }
}

module.exports.track = track;
