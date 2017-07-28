import React, { Component } from 'react'
import 'typeface-roboto'

import Back from './Back'
import Class from './Class'
import Header from './Header'
import PersonalInfo from './PersonalInfo'
import Placement from './Placement'
import './styles.css'

const classes = [1, 2, 3]

class App extends Component {
  render() {
    return (
      <div className='page-container'>
        <Header />

        <section className='left-panel space-items'>
          <Back />

          <div className='left-panel-content space-items'>
            <PersonalInfo />
            <Placement />
          </div>
        </section>

        <section className='class-list wide'>
          {classes.map(id =>
            <Class key={id} />
          )}
        </section>
      </div>
    );
  }
}

export default App
