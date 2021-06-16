import {Component, OnInit, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Parti} from '../../models/parti.model';
import {Observable} from 'rxjs';
import {DatatableComponent} from '@swimlane/ngx-datatable';
import {ActivatedRoute} from '@angular/router';
import {PartiService} from '../../services/parti-service.service';
import {ModalDismissReasons, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-parti',
  templateUrl: './parti.component.html',
  styleUrls: ['./parti.component.scss']
})
export class PartiComponent implements OnInit {
  partiForm = new FormGroup({
    partiName: new FormControl('', Validators.required)
  });

  partiName = new FormControl('', [Validators.required]);
  parti_found: boolean = false;
  parti: Parti;
  title: String = '';
  parties: Observable<Parti[]>;
  editing = {};
  rows = [];
  temp = [];

  @ViewChild(DatatableComponent, {static: false}) table: DatatableComponent;

  constructor(
    private activatedRoute: ActivatedRoute,
    private partiService: PartiService,
    private modalService: NgbModal
  ) {
    this.activatedRoute.data.subscribe(data => {
      this.title = data.title;
    });

  }

  ngOnInit(): void {
    this.partiService.getAll().subscribe((voters) => {
      this.rows = voters;
      this.temp = voters;
      // console.log("Les données",this.rows);
    });
  }


  showCrupdateProfessor() {

  }

  updateFilter(event) {
    const val = event.target.value.toLowerCase();
    // filter our data
    const temp = this.temp.filter(function (d) {
      return d.nom.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // update the rows
    this.rows = temp;
    // Whenever the filter changes, always go back to the first page
    this.table.offset = 0;
  }


  Accept() {
  }

  Reject(value: any) {

  }

  findBypartiName(value?: string) {
    this.partiService.getAll().subscribe((parties: any) => {
      let found;
      console.log(value);
      if (value) {
        found = parties.filter(parti => parti.name === value);
      } else {
        found = parties.filter(parti => parti.name === this.partiName.value);
      }
      if (found.length === 0) {
        this.parti_found = false;
        Swal.fire({
          title: 'parti Not  Found!',
          icon: 'error',
          confirmButtonText: 'ok'
        });
      } else {
        this.parti_found = true;
        this.parti = found[0];
        console.log('parti found', this.parti);
        Swal.fire({
          title: 'parti Found!',
          text: 'Check Data below',
          icon: 'success',
          confirmButtonText: 'Cool'
        });
      }
    });
  }

  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      console.log(`Closed with: ${result}`);
    }, (reason) => {
      console.log(`Dismissed ${this.getDismissReason(reason)}`);
    });
  }

  getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  onSubmit() {
    console.warn(this.partiForm.value);
    this.partiService.save(this.partiForm.value);
  }
}
