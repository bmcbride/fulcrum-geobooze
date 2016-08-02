app = {

  init: function() {
    this.authenticateModule.checkAuth();
    this.mapModule.configMap();
    this.formModule.configForm();
    this.bindUIActions();
  },

  bindUIActions: function() {
    $("#login-btn").click(function() {
      app.authenticateModule.login();
    });

    $("#logout-btn").click(function() {
      app.authenticateModule.logout();
    });

    $("#about-btn").click(function() {
      $("#collapsed-navbar").collapse("hide");
      $("#about-modal").modal("show");
    });

    $("#map-toggle-btn").click(function() {
      $("#collapsed-navbar").collapse("hide");
      if ($("#mapboxStreets").hasClass("active")) {
        app.map.addLayer(app.mapModule.layers.mapboxHyb);
        app.map.removeLayer(app.mapModule.layers.mapboxStreets);
      } else {
        app.map.addLayer(app.mapModule.layers.mapboxStreets);
        app.map.removeLayer(app.mapModule.layers.mapboxHyb);
      }
    });

    $("#login-modal").on("shown.bs.modal", function (e) {
      $(".modal-backdrop").css("opacity", "1");
    });

    $("#login-modal").on("hidden.bs.modal", function (e) {
      $(".modal-backdrop").css("opacity", "");
    });

    $("#form").submit(function(e) {
      if ($("#photo")[0].files.length > 0) {
        app.formModule.uploadPhoto();
      } else {
        app.formModule.submitRecord();
      }
      $("#loading-modal").modal("show");
      e.preventDefault();
    });
  },

  authenticateModule: {
    checkAuth: function() {
      if (!localStorage.getItem("fulcrum_geobooze_token")) {
        $("#login-modal").modal("show");
      } else {
        $("#login-modal").modal("hide");
        app.formModule.fetchBeerTypes();
      }
    },

    login: function() {
      var username = $("#email").val();
      var password = $("#password").val();
      $.ajax({
        type: "GET",
        url: "https://api.fulcrumapp.com/api/v2/users.json",
        contentType: "application/json",
        dataType: "json",
        headers: {
          "Authorization": "Basic " + btoa(username + ":" + password)
        },
        statusCode: {
          401: function() {
            alert("Incorrect credentials, please try again.");
          }
        },
        success: function (data) {
          $.each(data.user.contexts, function(index, context) {
            if (context.name == "Fulcrum Labs") {
              localStorage.setItem("fulcrum_geobooze_token", btoa(context.api_token));
              localStorage.setItem("fulcrum_userfullname", data.user.first_name + " " + data.user.last_name);
            }
          });
          if (!localStorage.getItem("fulcrum_geobooze_token")) {
            alert("This login does not have access to the Fulcrum Labs organization.");
          }
          app.authenticateModule.checkAuth();
        }
      });
    },

    logout: function() {
      localStorage.removeItem("fulcrum_geobooze_token");
      localStorage.removeItem("fulcrum_userfullname");
      location.reload();
    }
  },

  formModule: {
    configForm: function() {
      $.ajax({
        url: "form.html",
        success: function(data) {
          $("#form-fields").html(data);
          app.formModule.previewPhoto();
        }
      });

      webshims.setOptions("forms", {
        replaceValidationUI: true,
        lazyCustomMessages: true,
        iVal: {
          sel: ".ws-validate",
          handleBubble: "hide",
          errorMessageClass: "help-block",
          //successWrapperClass: "has-success",
          errorWrapperClass: "has-danger",
          fieldWrapper: ".form-group"
        },
        customDatalist: "auto",
        list: {
          "focus": true,
          "highlight": true
        }
      });

      webshims.setOptions("forms-ext", {
        replaceUI: false,
        types: "date range number",
        date: {
          startView: 2,
          openOnFocus: true
        },
        number: {
          calculateWidth: false
        },
        range: {
          classes: "show-activevaluetooltip"
        }
      });

      webshims.polyfill("forms forms-ext");
    },

    fetchBeerTypes: function() {
      var url = "https://api.fulcrumapp.com/api/v2/query/?format=json&token=" + atob(localStorage.getItem("fulcrum_geobooze_token")) + "&q=" + encodeURIComponent("SELECT _record_id, name FROM \"Beer Types\" ORDER BY name ASC");
      $.getJSON(url, function (data) {
        var options = "";
        $.each(data.rows, function(index, row) {
          options += '<option value="' + row.name + '"></option>';
        });
        $("#beers > select").htmlPolyfill(options);
      });
    },

    guid: function() {
      function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
      }
      return _p8() + _p8(true) + _p8(true) + _p8();
    },

    ratingToStars: function(rating) {
      return Array(rating + 1).join("★") + Array(6 - rating).join("☆");
    },

    previewPhoto: function() {
      $("#photo").change(function(e) {
        if (e.target.files.length > 0) {
          var file = e.target.files[0];
          var reader = new FileReader();
          reader.onload = function(e) {
            $("#photo-preview").attr("src", reader.result);
            $("#photo-preview").show();
          };
          reader.readAsDataURL(file);
        } else {
          $("#photo-preview").attr("src", "");
          $("#photo-preview").hide();
        }

      });
    },

    uploadPhoto: function() {
      var formData = new FormData();
      formData.append("photo[access_key]", this.guid());
      formData.append("photo[file]", $("#photo")[0].files[0]);
      $.ajax({
        type: "POST",
        url: "https://api.fulcrumapp.com/api/v2/photos.json",
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        dataType: "json",
        headers: {
          "X-ApiToken": atob(localStorage.getItem("fulcrum_geobooze_token"))
        },
        success: function (data) {
          app.formModule.submitRecord(data.photo.access_key);
        }
      });
    },

    submitRecord: function(photo_key) {
      var record = {
        "record": {
          "form_id": "3d8d8429-f578-4025-8b48-c6bdedb971d5", // Fulcrum Labs
          "latitude": $("#latitude").val(),
          "longitude": $("#longitude").val(),
          "form_values": {
            "f36f": $("[name='post_to_slack']").val(),
            "9fa9": $("[name='date']").val(),
            "8afb": $("[name='time']").val(),
            "758e": $("[name='name']").val(),
            "3722": $("[name='beer_type_value']").val(),
            "eb1a": $("[name='brewery']").val(),
            "2aeb": $("[name='abv']").val(),
            "a8c2": $("[name='venue']").val(),
            "a2f5": $("[name='rating']").val(),
            "adbb": $("[name='comments']").val(),
            "eca1": ":beer:"
          }
        }
      };

      var message = "Bottoms up! " + localStorage.getItem("fulcrum_userfullname") + " drank some " + $("[name='name']").val();
      if ($("[name='venue']").val()) {
        message += " at " + $("[name='venue']").val() + ".";
      } else {
        message += ".";
      }
      if ($("[name='rating']").val()) {
        message += "\nRating: " + this.ratingToStars(parseInt($("[name='rating']").val()));
      }
      if ($("[name='comments']").val()) {
        message += "\nComments: " + $("[name='comments']").val();
      }
      if (photo_key) {
        record.record.form_values["0a28"] = [{
          "photo_id": photo_key
        }];

        record.record.form_values.af67 = "https://web.fulcrumapp.com/shares/0f9c51f389d22079/photos/" +photo_key;

        message += "\n" + "https://web.fulcrumapp.com/shares/0f9c51f389d22079/photos/"+photo_key;
      }
      record.record.form_values["58ac"] = message;

      $.ajax({
        type: "POST",
        url: "https://api.fulcrumapp.com/api/v2/records.json",
        data: JSON.stringify(record),
        contentType: "application/json",
        dataType: "json",
        headers: {
          "X-ApiToken": atob(localStorage.getItem("fulcrum_geobooze_token"))
        },
        success: function (data) {
          $("#loading-modal").modal("hide");
          $("#photo-preview").hide();
          $("#form")[0].reset();
          $("#latitude").val(app.map.getCenter().lat.toFixed(6));
          $("#longitude").val(app.map.getCenter().lng.toFixed(6));
          alert("Your GeoBooze has been successfully submited! Well done, you deserve another round!");
        }
      });
    }
  },

  mapModule: {
    layers: {
      mapboxStreets: L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJ5bWNicmlkZSIsImEiOiJXN1NuOFFjIn0.3YNvR1YOvqEdeSsJDa-JUw', {
        maxZoom: 18,
        attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
      }),

      mapboxHyb: L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYnJ5bWNicmlkZSIsImEiOiJXN1NuOFFjIn0.3YNvR1YOvqEdeSsJDa-JUw', {
        maxZoom: 18,
        attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
      })
    },

    controls: {
      locateCtrl: L.control.locate({
        position: "topright",
        setView: "untilPan",
        keepCurrentZoomLevel: false,
        clickBehavior: {
          inView: "stop",
          outOfView: "setView"
        },
        drawCircle: true,
        drawMarker: true,
        showPopup: false,
        markerStyle: {
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.8
        },
        circleStyle: {
          weight: 1,
          clickable: false
        },
        icon: "fa fa-crosshairs",
        iconLoading: "fa fa-spinner fa-spin",
        metric: false,
        strings: {
          title: "My location",
          popup: "You are within {distance} {unit} from this point",
          outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
        },
        locateOptions: {
          maxZoom: 18,
          watch: true,
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        }
      }),

      fullscreenControl: L.control.fullscreen({
        position: "topright"
      })
    },

    configMap: function() {
      app.map = L.map("map", {
        layers: [this.layers.mapboxStreets],
        zoomControl: false
      }).fitWorld();

      app.map.attributionControl.setPrefix("");

      app.map.on("fullscreenchange", function(e) {
        if (app.map.isFullscreen()) {
          $(".crosshair").css("z-index", 9999999999);
        } else {
          $(".crosshair").css("z-index", "");
        }
    	});

      app.map.on("moveend", function(e) {
        $("#latitude").val(app.map.getCenter().lat.toFixed(6));
        $("#longitude").val(app.map.getCenter().lng.toFixed(6));
    	});

      this.controls.locateCtrl.addTo(app.map).start();

      this.controls.fullscreenControl.addTo(app.map);
    }
  }
};

$(document).ready(function() {
  app.init();
});
