import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AreaComponent} from './area.component';
import {AreaRoutingModule} from './area-routing.module';
import {NgbDatepickerModule} from '@ng-bootstrap/ng-bootstrap';
import {NgxDatatableModule} from '@swimlane/ngx-datatable';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';


@NgModule({
  declarations: [
    AreaComponent,
  ],
  imports: [
    CommonModule,
    AreaRoutingModule,
    NgbDatepickerModule,
    NgxDatatableModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class AreaModule {
}
