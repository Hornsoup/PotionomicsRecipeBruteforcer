import { Injectable } from '@angular/core';
import { IngredientsService, IngredientStats, FormulaType } from './ingredients.service';
import { MainLoopService } from './main-loop-service';

interface Indexer {
  ingredient: number[],
  index: number
}

interface Data {
  ingredAvail: number[],
  selectedFormula: FormulaType
}

enum PotionRank {
  Minor,
  Common,
  Greater,
  Grand,
  Superior,
  Masterwork
}

@Injectable({
  providedIn: 'root'
})
export class CombinationService {

  recipeList: IngredientStats[] = [{
    index: 0,
    name: "",
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    Total: 0,
    Price: 0
  }];

  ingredientList: IngredientStats[] = [];
  ingredAvail: number[] = [];
  indexer: Indexer[] = [{ index: 0, ingredient: [] }];
  totalCount = 0;
  hitCount = 0;
  superMode = false;

  private tempIngredAvail: number[] = [];
  private percA = 50 / 100;
  private percB = 50 / 100;
  private percC = 0 / 100;
  private percD = 0 / 100;
  private percE = 0 / 100;
  target = 375;
  ingredCount = 8;
  private comboIndex = 0; // only locally used

  constructor(
    public mainLoopService: MainLoopService,
    public ingredientsService: IngredientsService
  ) {

    mainLoopService.tickSubject.subscribe(() => {
      if (this.recipeList.length == 0) {
        this.recipeList.push({
          index: 0,
          name: "",
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          E: 0,
          Total: 0,
          Price: 0
        })
      }
      if (this.recipeList.length > 200) {
        this.recipeList.sort((a, b) => b.Total - a.Total);
        this.recipeList.splice(100);
        this.recipeList.push({
          index: 0,
          name: "",
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          E: 0,
          Total: 0,
          Price: 0
        });
      }
      this.tempIngredAvail.splice(0);
      for (let i = 0; i < this.ingredAvail.length - 1; i++) {
        this.tempIngredAvail.push(this.ingredAvail[i]);
      }
      this.superMode ? this.discoverCombinationsSuper() : this.discoverCombinationsPerfect();
      this.totalCount++;
    });
  }

  updateFormula() {
    this.percA = this.ingredientsService.formulas[this.ingredientsService.selectedFormula].A;
    this.percB = this.ingredientsService.formulas[this.ingredientsService.selectedFormula].B;
    this.percC = this.ingredientsService.formulas[this.ingredientsService.selectedFormula].C;
    this.percD = this.ingredientsService.formulas[this.ingredientsService.selectedFormula].D;
    this.percE = this.ingredientsService.formulas[this.ingredientsService.selectedFormula].E;
    this.superMode ? this.buildIngredientsSuper() : this.buildIngredientsPerfect();
    this.recipeInit();
  }

  targetCountUpdate(target: number, count: number) {
    this.target = target;
    this.ingredCount = count;
  }

  indexerInit() {
    this.indexer = [];
    let tempIndex: Indexer = { index: 0, ingredient: [] }
    let i = 0;
    while (i < this.ingredientList.length) {
      tempIndex.ingredient.push(this.ingredientList[i].index);
      i++;
    }
    tempIndex.index = tempIndex.ingredient.length - 1;
    for (i = 0; i < this.ingredCount; i++) {
      this.indexer.push({ index: tempIndex.index, ingredient: [] });
    }

  }

  recipeInit() {
    this.recipeList = [{
      index: 0,
      name: "",
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      Total: 0,
      Price: 0
    }];
    this.totalCount = 0;
    this.hitCount = 0;
  }

  saveData() {
    const data: Data = {
      ingredAvail: this.ingredAvail,
      selectedFormula: this.ingredientsService.selectedFormula
    }
    window.localStorage.setItem("AvailableIngredients", JSON.stringify(data))
  }

  loadData() {
    let fillSize = this.ingredientsService.ingredients.length - 1;
    const str = window.localStorage.getItem("AvailableIngredients");
    if (this.ingredientsService.ingredients.length < 2){
      this.ingredientsService.parseCSV()
    }
    if (str) {
      let data = JSON.parse(str) as Data;
      this.ingredAvail = data.ingredAvail;
      this.ingredientsService.selectedFormula = data.selectedFormula || 0;
      this.updateFormula();
    }
    if (!str || !this.ingredAvail) {
      this.ingredAvail.splice(0);
      for (let i = 0; i < this.ingredientsService.ingredients.length; i++) {
        this.ingredAvail.push(0);
      }
    } else if (this.ingredAvail.length < this.ingredientsService.ingredients.length){
      for (let i = this.ingredAvail.length; i < this.ingredientsService.ingredients.length; i++) {
        this.ingredAvail.push(0);
      }
    }
  }

  buildIngredientsSuper(arr: IngredientStats[] = this.ingredientsService.ingredients) {
    let percAtoE = 0;
    this.ingredientList = JSON.parse(JSON.stringify(arr));
    let i = this.ingredientList.length;
    let validA = this.percA > 0;
    let validB = this.percB > 0;
    let validC = this.percC > 0;
    let validD = this.percD > 0;
    let validE = this.percE > 0;


    // Sort and Filter out useless materials
    this.ingredientList.sort((a, b) => a.index - b.index);
    while (i > 0) {
      i--;
      percAtoE =
        Math.max((this.ingredientList[i].A / this.target) - this.percA, 0) +
        Math.max((this.ingredientList[i].B / this.target) - this.percB, 0) +
        Math.max((this.ingredientList[i].C / this.target) - this.percC, 0) +
        Math.max((this.ingredientList[i].D / this.target) - this.percD, 0) +
        Math.max((this.ingredientList[i].E / this.target) - this.percE, 0);

      if (percAtoE > 0.051 || !(
        ((this.ingredientList[i].A > 0) == validA && validA) ||
        ((this.ingredientList[i].B > 0) == validB && validB) ||
        ((this.ingredientList[i].C > 0) == validC && validC) ||
        ((this.ingredientList[i].D > 0) == validD && validD) ||
        ((this.ingredientList[i].E > 0) == validE && validE)
      )) {
        this.ingredientList.splice(i, 1);
      };
    }
    this.indexerInit();
  }

  joinIngredientsSuper(): number {
    let percAtoE = 0;
    let arr = this.indexer[this.comboIndex];
    let recipe = this.recipeList[this.recipeList.length - 1];

    while (arr.index >= 0) {
      if (!this.tempIngredAvail[this.ingredientList[arr.index].index]) {
        arr.index--;
        continue;
      }
      percAtoE =
        Math.max(((recipe.A + this.ingredientList[arr.index].A) / this.target) - this.percA, 0) +
        Math.max(((recipe.B + this.ingredientList[arr.index].B) / this.target) - this.percB, 0) +
        Math.max(((recipe.C + this.ingredientList[arr.index].C) / this.target) - this.percC, 0) +
        Math.max(((recipe.D + this.ingredientList[arr.index].D) / this.target) - this.percD, 0) +
        Math.max(((recipe.E + this.ingredientList[arr.index].E) / this.target) - this.percE, 0);
      if (percAtoE > 0.051 || ((this.ingredCount - 1 - this.comboIndex) * 4 + recipe.Total + this.ingredientList[arr.index].Total > this.target)) {
        arr.index--;
      } else {
        if (this.comboIndex != 0) {
          recipe.name += ",";
        }
        recipe.name += this.ingredientList[arr.index].name;
        recipe.A += this.ingredientList[arr.index].A;
        recipe.B += this.ingredientList[arr.index].B;
        recipe.C += this.ingredientList[arr.index].C;
        recipe.D += this.ingredientList[arr.index].D;
        recipe.E += this.ingredientList[arr.index].E;
        recipe.Total += this.ingredientList[arr.index].Total;
        this.tempIngredAvail[this.ingredientList[arr.index].index]--;
        break;
      }
    }
    return arr.index;
  }

  discoverCombinationsSuper() {

    //DO Combine
    this.joinIngredientsSuper()

    if (this.indexer[this.comboIndex].index < 0) {
      if (this.comboIndex <= 0) {
        this.mainLoopService.started = false;
        this.recipeList.sort((a, b) => b.Total - a.Total);
        this.recipeList.splice(101);
        return;
      }
      this.indexer[this.comboIndex - 1].index--;
      for (let j = this.comboIndex; j < this.ingredCount; j++) {
        this.indexer[j].index = this.indexer[this.comboIndex - 1].index;
      }
      this.comboIndex--;
      this.recipeList.pop();
      this.recipeList.push({
        index: 0,
        name: "",
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        Total: 0,
        Price: 0
      })
      return;
    }

    if (this.comboIndex >= this.ingredCount - 1) {
      this.indexer[this.comboIndex].index--;

      if (this.recipeList[this.recipeList.length - 1].Total != this.target) {
        this.recipeList.pop();
      } else {
        this.hitCount++;
      }
      this.recipeList.push({
        index: 0,
        name: "",
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        Total: 0,
        Price: 0
      })

    } else {
      this.comboIndex++;
      this.discoverCombinationsSuper();
    }
    this.comboIndex = 0;
  }

  buildIngredientsPerfect(arr: IngredientStats[] = this.ingredientsService.ingredients) {
    let percAtoE = 0;
    this.ingredientList = JSON.parse(JSON.stringify(arr));
    let i = this.ingredientList.length;
    let validA = this.percA > 0;
    let validB = this.percB > 0;
    let validC = this.percC > 0;
    let validD = this.percD > 0;
    let validE = this.percE > 0;


    // Sort and Filter out useless materials
    this.ingredientList.sort((a, b) => a.index - b.index);
    while (i > 0) {
      i--;
      percAtoE =
        Math.max((this.ingredientList[i].A / this.target) - this.percA, 0) +
        Math.max((this.ingredientList[i].B / this.target) - this.percB, 0) +
        Math.max((this.ingredientList[i].C / this.target) - this.percC, 0) +
        Math.max((this.ingredientList[i].D / this.target) - this.percD, 0) +
        Math.max((this.ingredientList[i].E / this.target) - this.percE, 0);

      if (percAtoE > 0 || !(
        ((this.ingredientList[i].A > 0) == validA && validA) ||
        ((this.ingredientList[i].B > 0) == validB && validB) ||
        ((this.ingredientList[i].C > 0) == validC && validC) ||
        ((this.ingredientList[i].D > 0) == validD && validD) ||
        ((this.ingredientList[i].E > 0) == validE && validE)
      )) {
        this.ingredientList.splice(i, 1);
      };
    }
    this.indexerInit();
  }

  joinIngredientsPerfect(): number {
    let percAtoE = 0;
    let arr = this.indexer[this.comboIndex];
    let recipe = this.recipeList[this.recipeList.length - 1];

    while (arr.index >= 0) {
      if (!this.tempIngredAvail[this.ingredientList[arr.index].index]) {
        arr.index--;
        continue;
      }
      let A = this.ingredientList[arr.index].A;
      let B = this.ingredientList[arr.index].B;
      let C = this.ingredientList[arr.index].C;
      let D = this.ingredientList[arr.index].D;
      let E = this.ingredientList[arr.index].E;
      let Total = this.ingredientList[arr.index].Total;
      if (this.comboIndex >= this.ingredCount - 1) {
        percAtoE =
          Math.max(((recipe.A + A) / (recipe.Total + Total)) - this.percA, 0) +
          Math.max(((recipe.B + B) / (recipe.Total + Total)) - this.percB, 0) +
          Math.max(((recipe.C + C) / (recipe.Total + Total)) - this.percC, 0) +
          Math.max(((recipe.D + D) / (recipe.Total + Total)) - this.percD, 0) +
          Math.max(((recipe.E + E) / (recipe.Total + Total)) - this.percE, 0);
      } else {
        percAtoE =
          Math.max(((recipe.A + A) / this.target) - this.percA, 0) +
          Math.max(((recipe.B + B) / this.target) - this.percB, 0) +
          Math.max(((recipe.C + C) / this.target) - this.percC, 0) +
          Math.max(((recipe.D + D) / this.target) - this.percD, 0) +
          Math.max(((recipe.E + E) / this.target) - this.percE, 0);
      }
      if (percAtoE > 0 || ((this.ingredCount - 1 - this.comboIndex) * 4 + recipe.Total + this.ingredientList[arr.index].Total > this.target)) {
        arr.index--;
      } else {
        if (this.comboIndex != 0) {
          recipe.name += ",";
        }
        recipe.name += this.ingredientList[arr.index].name;
        recipe.A += A;
        recipe.B += B;
        recipe.C += C;
        recipe.D += D;
        recipe.E += E;
        recipe.Total += Total;
        this.tempIngredAvail[this.ingredientList[arr.index].index]--;
        break;
      }
    }
    return arr.index;
  }

  discoverCombinationsPerfect() {

    //DO Combine
    this.joinIngredientsPerfect()

    if (this.indexer[this.comboIndex].index < 0) {
      if (this.comboIndex <= 0) {
        this.mainLoopService.started = false;
        this.recipeList.sort((a, b) => b.Total - a.Total);
        this.recipeList.splice(101);
        return;
      }
      this.indexer[this.comboIndex - 1].index--;
      for (let j = this.comboIndex; j < this.ingredCount; j++) {
        this.indexer[j].index = this.indexer[this.comboIndex - 1].index;
      }
      this.comboIndex--;
      this.recipeList.pop();
      this.recipeList.push({
        index: 0,
        name: "",
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        Total: 0,
        Price: 0
      })
      return;
    }

    if (this.comboIndex >= this.ingredCount - 1) {
      this.indexer[this.comboIndex].index--;

      if (this.recipeList[this.recipeList.length - 1].Total > this.target) {
        this.recipeList.pop();
      } else {
        this.hitCount++;
      }
      this.recipeList.push({
        index: 0,
        name: "",
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        Total: 0,
        Price: 0
      })
    } else {
      this.comboIndex++;
      this.discoverCombinationsPerfect();
    }
    this.comboIndex = 0;
  }

}
